import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/realtime_service.dart';
import '../../widgets/skeleton_loader.dart';

class TrackingScreen extends StatefulWidget {
  final String serviceId;
  final RealtimeService? realtimeService;
  final ApiService? apiService;

  const TrackingScreen({
    super.key,
    required this.serviceId,
    this.realtimeService,
    this.apiService,
  });

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen>
    with WidgetsBindingObserver {
  late final ApiService _api;
  late final RealtimeService _realtime;

  bool _isLoading = true;
  Map<String, dynamic>? _service;
  Map<String, dynamic>? _provider;
  String _status = 'pending';
  final ScrollController _timelineController = ScrollController();

  StreamSubscription? _serviceSubscription;
  Timer? _pollingTimer;

  bool _isNavigatingToPayment = false;
  bool _hasNavigatedToReview = false;
  bool _hasShownArrivalModal = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _api = widget.apiService ?? ApiService();
    _realtime = widget.realtimeService ?? RealtimeService();
    _loadService();
    _setupRealtime();
    _startPolling();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadService();
      _realtime.connect();
    }
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _loadService(silent: true);
    });
  }

  void _setupRealtime() {
    // Listen to Service Updates (Status changes, etc.)
    _serviceSubscription = _realtime.getServiceStream(widget.serviceId).listen((
      snapshot,
    ) {
      if (snapshot.exists) {
        // Reload full details from API to ensure consistency
        _loadService();
      }
    });

    // Listen specifically for provider_arrived event for immediate feedback
    _realtime.onEvent('provider_arrived', _handleProviderArrivedEvent);
  }

  void _handleProviderArrivedEvent(dynamic data) {
    if (!mounted) return;

    // Safety check: Providers shouldn't see this modal
    if (_api.role == 'provider') return;

    final sId = data['service_id'] ?? data['id'];
    // Convert to string for comparison to be safe
    if (sId?.toString() == widget.serviceId && !_hasShownArrivalModal) {
      setState(() => _hasShownArrivalModal = true);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Prestador chegou ao local!',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 5),
        ),
      );

      _showArrivalPaymentDialog(data is Map<String, dynamic> ? data : null);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _realtime.offEvent('provider_arrived', _handleProviderArrivedEvent);
    _serviceSubscription?.cancel();
    _pollingTimer?.cancel();
    _timelineController.dispose();
    super.dispose();
  }

  Future<void> _loadService({bool silent = false}) async {
    try {
      final data = await _api.getServiceDetails(widget.serviceId);
      if (!mounted) return;

      final oldArrivedAt = _service?['arrived_at'];
      final newArrivedAt = data['arrived_at'];
      final locationType = data['location_type'] ?? 'client';

      // Check for provider arrival (Flow A)
      if (locationType == 'client' &&
          oldArrivedAt == null &&
          newArrivedAt != null &&
          !_hasShownArrivalModal) {
        setState(() => _hasShownArrivalModal = true);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Prestador chegou ao local!',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 5),
          ),
        );

        // Auto-prompt payment for Flow A
        if (data['payment_remaining_status'] != 'paid') {
          _showArrivalPaymentDialog(data);
        }
      }

      if (data['status'] == 'waiting_client_confirmation') {
        if (!_hasNavigatedToReview && mounted) {
          _hasNavigatedToReview = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            context.push('/review/${widget.serviceId}');
          });
        }
      }

      setState(() {
        _service = data;
        _status = data['status'] ?? 'pending';

        // Auto-navigate to payment if service started and not paid
        if (_status == 'in_progress' &&
            data['payment_remaining_status'] != 'paid' &&
            !_isNavigatingToPayment) {
          _isNavigatingToPayment = true;
          // Delay slightly to ensure UI build
          Future.delayed(Duration.zero, () {
            _handlePayRemaining().then((_) {
              if (mounted) {
                setState(() => _isNavigatingToPayment = false);
              }
            });
          });
        }

        // Handle both nested and flat provider data
        if (data['provider'] != null) {
          _provider = data['provider'];
        } else if (data['provider_id'] != null) {
          _provider = {
            'id': data['provider_id'],
            'name': data['provider_name'] ?? 'Prestador',
            'phone': data['provider_phone'],
            'avatar': data['provider_avatar'],
            'avatar_url': data['provider_avatar_url'],
            'rating': data['provider_rating'] ?? 5.0,
          };
        } else {
          _provider = null;
        }

        // Provider tracking removido

        // Recalculate arrival time if location type is provider and we have coords
        if (locationType == 'provider' &&
            data['provider_lat'] != null &&
            data['provider_lon'] != null) {
          // Calculate distance and time to leave
          // This would ideally be done via a routing API (OSRM/Google)
          // For now, simple haversine distance / average speed
        }
        _isLoading = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollTimelineToCurrentStep();
      });
    } catch (e) {
      debugPrint('Error loading service: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showArrivalPaymentDialog([Map<String, dynamic>? data]) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Prestador Chegou!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'O prestador confirmou a chegada. Por favor, realize o pagamento do valor restante para liberar o início do serviço.',
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Agora não'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _handlePayRemaining();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.secondary,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Pagar Agora'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'O prestador recebe o valor somente após a conclusão do serviço.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleContest() async {
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Contestar Serviço'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              hintText: 'Motivo da contestação',
              border: OutlineInputBorder(),
            ),
            maxLines: 3,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, controller.text),
              child: const Text('Enviar'),
            ),
          ],
        );
      },
    );

    if (reason != null && reason.isNotEmpty) {
      try {
        await _api.contestService(widget.serviceId, reason);
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Contestação enviada!')));
          _loadService();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao enviar contestação: $e')),
          );
        }
      }
    }
  }

  Future<void> _handleArrive() async {
    try {
      await _api.arriveService(widget.serviceId);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Chegada confirmada!')));

        // If Flow B (Client going to provider), automatically open payment
        final locationType = _service?['location_type'] ?? 'client';
        if (locationType == 'provider') {
          _handlePayRemaining();
        } else {
          _loadService();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao confirmar chegada: $e')),
        );
      }
    }
  }

  Future<void> _handlePayRemaining() async {
    // Navigate to payment screen for remaining amount
    double total = 0.0;
    double deposit = 0.0;

    if (_service != null) {
      total =
          double.tryParse(_service!['price_estimated']?.toString() ?? '0') ??
          0.0;
      deposit =
          double.tryParse(_service!['price_upfront']?.toString() ?? '0') ?? 0.0;
    }

    // Remaining is Total - Deposit (if deposit was paid)
    // If we want to be safe, we can just pass the total and let the backend/logic handle it,
    // but usually we want to show the user what they are paying.
    double amountToPay = total > deposit ? (total - deposit) : total;
    if (amountToPay <= 0) amountToPay = 50.0; // Fallback

    await context.push(
      '/payment/${widget.serviceId}',
      extra: {
        'serviceId': widget.serviceId,
        'type': 'remaining',
        'amount': amountToPay,
        'total': total,
      },
    );
    // Reload after returning from payment
    if (mounted) {
      setState(() => _isLoading = true);
    }
    _loadService();
  }

  Future<void> _handleConfirm() async {
    // TODO: Add rating dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Serviço confirmado com sucesso!')),
    );
    context.go('/home');
  }

  void _scrollTimelineToCurrentStep() {
    if (!_timelineController.hasClients) return;

    const stepWidth = 140.0;
    int index = 0;

    if (_status == 'accepted') {
      index = 1;
    } else if (_status == 'waiting_remaining_payment') {
      index = 2;
    } else if ([
      'in_progress',
      'waiting_client_confirmation',
      'on_way',
    ].contains(_status)) {
      index = 3;
    } else if (_status == 'completed') {
      index = 4;
    }

    final screenWidth = MediaQuery.of(context).size.width;
    final targetCenter = index * stepWidth;
    double offset = targetCenter - (screenWidth / 2 - stepWidth / 2);

    final max = _timelineController.position.maxScrollExtent;
    if (offset < 0) offset = 0;
    if (offset > max) offset = max;

    _timelineController.animateTo(
      offset,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOut,
    );
  }

  Widget _buildValidationCodeCard() {
    final code = _service?['validation_code'];
    if (code == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          const Text(
            'Código de Validação',
            style: TextStyle(
              color: Colors.blue,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            code,
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              letterSpacing: 4,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Informe este código ao prestador ao final do serviço',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildProofSection() {
    final photoUrl = _service?['proof_photo'];
    // ignore: unused_local_variable
    final code = _service?['proof_code'];

    if (photoUrl == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Comprovante do Serviço',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CachedNetworkImage(
              imageUrl: photoUrl,
              height: 200,
              width: double.infinity,
              fit: BoxFit.cover,
              memCacheHeight: 400, // Optimize memory usage
              maxWidthDiskCache: 800, // Optimize storage usage
              placeholder: (context, url) => BaseSkeleton(height: 200, width: 800), // BaseSkeleton is NOT const
              errorWidget: (context, url, error) => Container(
                height: 200,
                color: Colors.grey[200],
                child: const Icon(Icons.broken_image, color: Colors.grey),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    if (_service == null) return const SizedBox.shrink();

    final status = _status;
    final locationType = _service!['location_type'] ?? 'client';
    final arrivedAt = _service!['arrived_at'];
    final paymentStatus = _service!['payment_remaining_status'];

    // Flow B: Client goes to provider
    if (locationType == 'provider') {
      if (status == 'accepted') {
        if (arrivedAt == null) {
          return SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(LucideIcons.mapPin),
              label: const Text('Cheguei no Local'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _handleArrive,
            ),
          );
        } else if (paymentStatus != 'paid') {
          return SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(LucideIcons.creditCard),
              label: const Text('Pagar Restante'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _handlePayRemaining,
            ),
          );
        } else {
          return const Center(
            child: Text(
              'Pagamento realizado. Aguardando início...',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
          );
        }
      }
    }
    // Flow A: Provider comes to client
    else {
      if ([
        'accepted',
        'waiting_remaining_payment',
        'in_progress',
      ].contains(status)) {
        if (arrivedAt != null && paymentStatus != 'paid') {
          return SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(LucideIcons.creditCard),
              label: const Text('Pagar Restante'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _handlePayRemaining,
            ),
          );
        } else if (arrivedAt != null) {
          return const Center(
            child: Text(
              'Prestador chegou. Realizando Servirço aguarde...',
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue),
            ),
          );
        }
      }
    }

    // Completion actions
    if (status == 'completed') {
      if (locationType == 'client') {
        // Flow A: Can contest
        return Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(LucideIcons.checkCircle),
                label: const Text('Confirmar Conclusão'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _handleConfirm,
              ),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              icon: const Icon(LucideIcons.alertTriangle),
              label: const Text('Contestar Serviço'),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              onPressed: _handleContest,
            ),
          ],
        );
      } else {
        // Flow B: Just confirm
        return Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(LucideIcons.checkCircle),
                label: const Text('Confirmar Conclusão'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _handleConfirm,
              ),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              icon: const Icon(LucideIcons.alertTriangle),
              label: const Text('Contestar Serviço'),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              onPressed: _handleContest,
            ),
          ],
        );
      }
    }

    // Default: Chat button if accepted/in_progress
    if ((_isAccepted() || _isInProgress()) && _provider != null) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          icon: const Icon(LucideIcons.messageCircle),
          label: const Text('Enviar Mensagem'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryPurple,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          onPressed: () {
            context.push('/chat', extra: widget.serviceId);
          },
        ),
      );
    }

    if (_status == 'pending') {
      return const Center(
        child: Text(
          'Aguardando um prestador aceitar...',
          style: TextStyle(color: Colors.grey),
        ),
      );
    }

    return const SizedBox.shrink();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(LucideIcons.chevronLeft),
            onPressed: () => context.go('/home'),
          ),
          title: const Text('Acompanhamento do serviço'),
        ),
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryPurple),
        ),
      );
    }

    if (_service == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Erro')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Não foi possível carregar o serviço.'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadService,
                child: const Text('Tentar Novamente'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          onPressed: () => context.go('/home'),
        ),
        title: const Text('Acompanhamento do serviço'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Título principal e status atual
              Text(
                _service?['category']?.toString() ?? 'Serviço',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _service?['description']?.toString() ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 16),

              // Linha do tempo de serviço focada em fluxo de pagamento 30% + 70%
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  controller: _timelineController,
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildTimelineItem('Serviço solicitado', true, true),
                      _buildTimelineLine(_isAccepted() && _provider != null),
                      _buildTimelineItem(
                        'Prestador aceitou',
                        _isAccepted() && _provider != null,
                        _isAccepted() && _provider != null,
                      ),
                      _buildTimelineLine(_isWaitingRemainingPayment()),
                      _buildTimelineItem(
                        'Aguardando pagamento restante',
                        _isWaitingRemainingPayment(),
                        _isWaitingRemainingPayment(),
                      ),
                      _buildTimelineLine(_isInProgress()),
                      _buildTimelineItem(
                        'Serviço em andamento',
                        _isInProgress(),
                        false,
                      ),
                      _buildTimelineLine(_isCompleted()),
                      _buildTimelineItem(
                        'Serviço concluído',
                        _isCompleted(),
                        _isCompleted(),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Resumo financeiro 30% + 70%
                      if (_service != null &&
                          _service!['price_estimated'] != null) ...[
                        _buildPaymentSummary(),
                        const SizedBox(height: 24),
                      ],


                      // Card do prestador ou mensagem de espera
                      if (_provider != null)
                        _buildProviderCard()
                      else
                        _buildWaitingCard(),

                      const SizedBox(height: 24),

                      // Código de validação
                      _buildValidationCodeCard(),

                      const SizedBox(height: 16),

                      // Provas / fotos do serviço
                      _buildProofSection(),
                    ],
                  ),
                ),
              ),

              // Ações principais (ex: falar com prestador, confirmar conclusão)
              _buildActionButtons(),
            ],
          ),
        ),
      ),
    );
  }

  bool _isAccepted() {
    return [
      'accepted',
      'waiting_remaining_payment',
      'in_progress',
      'waiting_client_confirmation',
      'on_way',
      'completed',
    ].contains(_status);
  }

  bool _isInProgress() {
    return [
      'in_progress',
      'waiting_client_confirmation',
      'on_way',
      'completed',
    ].contains(_status);
  }

  bool _isWaitingRemainingPayment() {
    if (_status == 'waiting_remaining_payment') return true;
    final remainingStatus = _service?['payment_remaining_status']?.toString();
    return remainingStatus != null && remainingStatus != 'paid';
  }

  bool _isCompleted() {
    return ['completed'].contains(_status);
  }

  Widget _buildProviderCard() {
    final name = _provider?['name']?.toString() ?? 'Prestador';
    final displayName = name.isNotEmpty ? name : 'Prestador';
    // ignore: unused_local_variable
    final photo = _provider?['photo_url']; // TODO: Use photo

    return Row(
      children: [
        CircleAvatar(
          radius: 28,
          backgroundColor: AppTheme.primaryPurple,
          child: Text(
            displayName.substring(0, 1).toUpperCase(),
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                displayName,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '4.8',
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        InkWell(
          onTap: () {
            final id = _service?['id']?.toString() ?? widget.serviceId;
            context.push('/chat', extra: id);
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.green[50],
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(LucideIcons.messageCircle, color: Colors.green),
          ),
        ),
      ],
    );
  }

  Widget _buildWaitingCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 12),
          Text(
            'Procurando prestadores...',
            style: TextStyle(color: Colors.orange[800]),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSummary() {
    final totalValue =
        double.tryParse(_service!['price_estimated'].toString()) ?? 0.0;
    final upfrontValue = totalValue * 0.30;
    final remainingRaw = totalValue - upfrontValue;
    final remaining = remainingRaw < 0 ? 0.0 : remainingRaw;

    String formatBRL(double v) {
      final s = v.toStringAsFixed(2);
      return 'R\$ ${s.replaceAll('.', ',')}';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Pagamento do serviço',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Valor total', style: TextStyle(color: Colors.grey)),
              Text(
                formatBRL(totalValue),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Entrada (30%)', style: TextStyle(color: Colors.grey)),
              Text(
                formatBRL(upfrontValue),
                style: TextStyle(
                  color: Theme.of(context).primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Restante (70%)',
                style: TextStyle(color: Colors.grey),
              ),
              Text(
                formatBRL(remaining),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.secondaryOrange.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              _getPaymentStatusMessage(_status),
              style: const TextStyle(fontSize: 12, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }



  String _getPaymentStatusMessage(String status) {
    switch (status) {
      case 'in_progress':
        return 'Aguardando conclusão do serviço. A plataforma irá liberar o pagamento ao prestador após a confirmação da conclusão.';
      case 'completed':
        return 'Serviço concluído. Pagamento total realizado e liberado para o prestador.';
      case 'accepted':
      case 'on_way':
        return 'Prestador a caminho. O pagamento restante será solicitado na chegada do prestador.';
      case 'waiting_remaining_payment':
         return 'Prestador chegou! Realize o pagamento do restante para iniciar o serviço.';
      default:
        return 'Você já pagou 30% na abertura do pedido. Os 70% restantes são liberados somente após a conclusão do serviço.';
    }
  }

  Widget _buildTimelineItem(String label, bool isActive, bool isCompleted) {
    return Column(
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: isCompleted
                ? AppTheme.primaryPurple
                : (isActive ? Colors.white : Colors.grey[300]),
            border: Border.all(
              color: isActive ? AppTheme.primaryPurple : Colors.transparent,
              width: 2,
            ),
            shape: BoxShape.circle,
          ),
          child: isCompleted
              ? const Icon(Icons.check, size: 14, color: Colors.white)
              : null,
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isActive ? AppTheme.primaryPurple : Colors.grey,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineLine(bool isActive) {
    return SizedBox(
      width: 32,
      child: Container(
        height: 2,
        color: isActive ? AppTheme.primaryPurple : Colors.grey[300],
      ),
    );
  }
}
