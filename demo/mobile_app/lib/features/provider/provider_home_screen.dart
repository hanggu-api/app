import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/api_service.dart';
import '../../services/media_service.dart';
import '../../services/realtime_service.dart';
import 'finish_service_screen.dart';
import 'utils/travel_helper.dart';
import 'widgets/service_offer_modal.dart';
import '../../widgets/skeleton_loader.dart';

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;
  _SliverAppBarDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(color: Colors.grey[50], child: _tabBar);
  }

  @override
  bool shouldRebuild(covariant _SliverAppBarDelegate oldDelegate) => false;
}

class ProviderHomeScreen extends StatefulWidget {
  final bool loadOnInit;
  final bool connectRealtime;
  final List<dynamic>? initialAvailableServices;
  final List<dynamic>? initialMyServices;
  const ProviderHomeScreen({
    super.key,
    this.loadOnInit = true,
    this.connectRealtime = true,
    this.initialAvailableServices,
    this.initialMyServices,
  });

  @override
  State<ProviderHomeScreen> createState() => _ProviderHomeScreenState();
}

class _ProviderHomeScreenState extends State<ProviderHomeScreen>
    with TickerProviderStateMixin, WidgetsBindingObserver {
  late TabController _tabController;
  final _api = ApiService();
  // ignore: unused_field
  List<dynamic> _availableServices = [];
  List<dynamic> _myServices = [];
  String? _notifText;
  bool _loadingData = false;
  final Map<String, Map<String, String>> _travelById = {};
  final _media = MediaService();
  Uint8List? _avatarBytes;
  String? _userName;
  bool _isFixedLocation = false;
  int? _currentUserId;
  List<Map<String, dynamic>> _slots = [];
  Timer? _slotRefreshTimer;
  bool _loadingSlots = true;

  // Config Tab State - Map from day_of_week (0=Sun, 1=Mon... 6=Sat)
  final Set<String> _openOfferIds = {};

  // Notification State
  // int _unreadCount = 0;
  late AnimationController _bellController;
  final bool _isNotificationsOpen = false;
  
  // Date selection state for unified schedule
  DateTime _selectedDate = DateTime.now().toUtc().subtract(const Duration(hours: 3));

  // Notifiers para atualizações granulares sem rebuild geral
  final ValueNotifier<bool> _isLoadingVN = ValueNotifier<bool>(true);
  final ValueNotifier<List<Map<String, dynamic>>> _notificationsVN =
      ValueNotifier<List<Map<String, dynamic>>>([]);

  @override
  void initState() {
    super.initState();
    _bellController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    WidgetsBinding.instance.addObserver(this);
    _checkLocationPermission();
    _isFixedLocation = _api.isFixedLocation;
    _tabController = TabController(length: _isFixedLocation ? 1 : 3, vsync: this);
    if (widget.initialAvailableServices != null ||
        widget.initialMyServices != null) {
      _availableServices =
          widget.initialAvailableServices ?? _availableServices;
      _myServices = widget.initialMyServices ?? _myServices;
      _isLoadingVN.value = false;
      if (_availableServices.isNotEmpty) {
        final first = _availableServices.first;
        _notifText =
            '${first['category_name'] ?? first['description'] ?? 'Serviço'} - ${first['address'] ?? ''}';
      } else {
        _notifText = null;
      }
    }
    if (widget.loadOnInit) {
      _initSocket();
      _loadData(); // This now handles profile + services
    }
  }

  void _initSocket() {
    final rt = RealtimeService();
    // Use the stored userId if available
    if (_currentUserId != null) {
      rt.init(_currentUserId!);
    }
    rt.on('service.created', _handleServiceCreated);
    rt.on('service.offered', _handleServiceOffered);
    rt.on('payment_remaining', _handlePaymentUpdate);
    rt.connect();
  }

  @override
  void dispose() {
    _bellController.dispose();
    _isLoadingVN.dispose();
    _notificationsVN.dispose();
    _slotRefreshTimer?.cancel();
    _tabController.dispose();
    RealtimeService().stopLocationUpdates();
    if (widget.connectRealtime) {
      final rt = RealtimeService();
      rt.off('service.created', _handleServiceCreated);
      rt.off('service.offered', _handleServiceOffered);
      rt.off('payment_remaining', _handlePaymentUpdate);
    }
    super.dispose();
  }

  void _handleServiceCreated(dynamic data) async {
    if (!mounted) return;
    try {
      if (!kIsWeb) {
        // Notification removed as per user request to avoid "modal"
        // await NotificationService().showFromService(
        //   data,
        //   event: 'created',
        // );
      }
    } catch (_) {}
    if (mounted) {
      _loadData();
    }
  }

  void _handleServiceOffered(dynamic data) {
    if (mounted) {
      debugPrint('🔔 Service Offered Event Received: $data');
      if (data is Map<String, dynamic>) {
        _onServiceOffered(data);
      } else if (data is Map) {
        // Safe conversion
        _onServiceOffered(Map<String, dynamic>.from(data));
      } else {
        debugPrint(
          '❌ Invalid data type for service.offered: ${data.runtimeType}',
        );
      }
    }
  }

  void _handlePaymentUpdate(dynamic data) {
    if (mounted) {
      debugPrint('💰 Payment Update Received: $data');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pagamento confirmado pelo cliente!'),
          backgroundColor: Colors.green,
        ),
      );
      _loadData();
    }
  }

  Future<void> _checkLocationPermission() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Por favor, habilite a localização.')),
          );
        }
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Permissão de localização negada permanentemente.'),
            ),
          );
        }
      }

      // Force get position to activate/warm up
      if (serviceEnabled &&
          (permission == LocationPermission.always ||
              permission == LocationPermission.whileInUse)) {
        await Geolocator.getCurrentPosition();
      }
    } catch (_) {}
  }

  Future<void> _loadAvatar() async {
    try {
      final bytes = await _media.loadMyAvatarBytes();
      if (mounted && bytes != null) {
        setState(() => _avatarBytes = bytes);
      }
    } catch (_) {}
  }

  Future<void> _loadSchedule(DateTime displayDate) async {
    if (_currentUserId == null) return;
    try {
      if (_slots.isEmpty) setState(() => _loadingSlots = true);
      final dateStr = "${displayDate.year}-${displayDate.month.toString().padLeft(2, '0')}-${displayDate.day.toString().padLeft(2, '0')}";
      
      final slots = await _api.getProviderSlots(_currentUserId!, date: dateStr);
      if (mounted) {
        setState(() {
          _slots = slots;
          _loadingSlots = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading slots: $e');
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  Future<void> _toggleSlotBusy(Map<String, dynamic> slot) async {
    try {
      final start = DateTime.parse(slot['start_time']);
      final status = slot['status'];
      final appointmentId = slot['appointment_id'];

      if (status == 'free') {
        await _api.markSlotBusy(start);
        _loadSchedule(_selectedDate); // Refresh
      } else if (status == 'busy' && appointmentId != null) {
        // Permitir liberar horário marcado manualmente como ocupado
        await _api.deleteAppointment(appointmentId);
        _loadSchedule(_selectedDate);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Este horário já está ocupado ou agendado.'),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erro ao atualizar status: $e')));
    }
  }

  Future<void> _loadProfile() async {
    try {
      final user = await _api.getMyProfile();

      // Check for redirect if user is medical but landed on standard provider home
      if (mounted) {
        final isMedical = _api.isMedical;
        if (isMedical) {
          debugPrint('ProviderHomeScreen: Redirecting to /medical-home');
          context.go('/medical-home');
          return;
        }
      }

      if (mounted) {
        setState(() {
          _userName = user['name'] ?? user['full_name'];
        });

        // Iniciar rastreamento de localização se for um usuário válido
        if (user['id'] != null) {
          final userId = user['id'] is int
              ? user['id']
              : int.tryParse(user['id'].toString());

          if (userId != null) {
            _currentUserId = userId;
            debugPrint('👤 ProviderHomeScreen: Loaded User ID: $userId');
            // Garante que o socket esteja autenticado para receber eventos direcionados
            RealtimeService().authenticate(userId);

            // The flag is now central in ApiService and fetched from backend
            final isFixedLocation = _api.isFixedLocation;

            if (mounted) {
              if (_isFixedLocation != isFixedLocation) {
                setState(() {
                  _isFixedLocation = isFixedLocation;
                  // Re-initialize tab controller if logic changes
                  _tabController.dispose();
                  _tabController = TabController(length: _isFixedLocation ? 1 : 3, vsync: this);
                });
              }
            }

            if (!isFixedLocation) {
              RealtimeService().startLocationUpdates(userId);
            } else {
              debugPrint(
                'ProviderHomeScreen: Fixed location provider. Tracking disabled.',
              );
              RealtimeService().stopLocationUpdates();

              // Start loading slots
              _loadSchedule(_selectedDate);
              _slotRefreshTimer?.cancel();
              _slotRefreshTimer = Timer.periodic(const Duration(minutes: 1), (
                timer,
              ) {
                _loadSchedule(_selectedDate);
              });
            }
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _onServiceOffered(Map<String, dynamic> data) async {
    // Tocar som de alerta
    try {
      final player = AudioPlayer();
      await player.play(AssetSource('sounds/iphone_notificacao.mp3'));
    } catch (e) {
      debugPrint('Erro ao tocar som: $e');
    }

    if (!mounted) return;

    // Refresh data to show the new service in the list/card
    _loadSchedule(_selectedDate);
    _loadData();

    // Show Modal instead of SnackBar
    final serviceId = data['id'] ?? data['service_id'];
    if (serviceId != null) {
      final sId = serviceId.toString();
      if (_openOfferIds.contains(sId)) return;
      _openOfferIds.add(sId);

      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => ServiceOfferModal(
          serviceId: sId,
          initialData: data,
          onAccepted: _loadData,
          onRejected: _loadData,
        ),
      );
      _openOfferIds.remove(sId);
    }
  }

  Future<void> _handleArrived(String serviceId) async {
    _isLoadingVN.value = true;
    try {
      await _api.notifyProviderArrived(serviceId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cliente notificado da sua chegada!')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao notificar chegada: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingVN.value = false);
      }
    }
  }

  Future<void> _loadData() async {
    if (_loadingData || !mounted) return;
    _loadingData = true;
    _isLoadingVN.value = true;

    // Fire and forget avatar/profile load to not block main content
    _loadAvatar();
    _loadProfile();

    try {
      final available = await _api.getAvailableServices();
      final my = await _api.getMyServices();

      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          setState(() {
            _availableServices = available;
            _myServices = my;
            _notifText = (available.isNotEmpty)
                ? '${available.first['category_name'] ?? available.first['description'] ?? 'Serviço'} - ${available.first['address'] ?? ''}'
                : null;
          });
          _isLoadingVN.value = false;
          _loadingData = false;
          if (_availableServices.isNotEmpty) {
            _prefetchTravelForFirstAvailable();
          }
        });
      } else {
        _loadingData = false;
      }
    } catch (e) {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          _isLoadingVN.value = false;
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Erro ao carregar: $e')));
          _loadingData = false;
        });
      } else {
        _loadingData = false;
      }
    }
  }

  Future<void> _prefetchTravelForFirstAvailable() async {
    final first = _availableServices.first;
    _ensureLoadTravelForItem(first);
  }

  void _ensureLoadTravelForItem(Map<String, dynamic> item) {
    final String? id = item['id']?.toString();
    if (id == null) return;
    if (_travelById.containsKey(id)) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTravelForService(item);
    });
  }

  Future<void> _loadTravelForService(Map<String, dynamic> s) async {
    try {
      final toLat = s['latitude'] is num
          ? (s['latitude'] as num).toDouble()
          : double.tryParse('${s['latitude']}');
      final toLon = s['longitude'] is num
          ? (s['longitude'] as num).toDouble()
          : double.tryParse('${s['longitude']}');
      if (toLat == null || toLon == null) return;

      double? gasolina;
      final cityState = await _api.reverseCityStateFromCoords(toLat, toLon);
      // ignore: unnecessary_null_comparison
      if (cityState != null) {
        final prices = await _api.fetchFuelPriceByCityState(
          cityState['city']!,
          cityState['state']!,
        );
        if (prices.isNotEmpty && prices['gasolina'] is num) {
          gasolina = (prices['gasolina'] as num).toDouble();
        }
      }
      if (gasolina == null) {
        final stateName = await _api.reverseStateFromCoords(toLat, toLon);
        final rawFuel = await _api.fetchFuelPricesByState(stateName);
        if (rawFuel['gasolina'] is num) {
          gasolina = (rawFuel['gasolina'] as num).toDouble();
        }
      }

      double? fromLat;
      double? fromLon;
      try {
        final serviceOn = await Geolocator.isLocationServiceEnabled();
        LocationPermission perm = await Geolocator.checkPermission();
        if (perm == LocationPermission.denied) {
          perm = await Geolocator.requestPermission();
        }
        if (serviceOn &&
            perm != LocationPermission.denied &&
            perm != LocationPermission.deniedForever) {
          final pos = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
            ),
          );
          fromLat = pos.latitude;
          fromLon = pos.longitude;
        }
      } catch (_) {}
      fromLat =
          fromLat ??
          (s['provider_lat'] is num
              ? (s['provider_lat'] as num).toDouble()
              : double.tryParse('${s['provider_lat']}')) ??
          -23.5505;
      fromLon =
          fromLon ??
          (s['provider_lon'] is num
              ? (s['provider_lon'] as num).toDouble()
              : double.tryParse('${s['provider_lon']}')) ??
          -46.6333;

      final route = await _api.getRouteMetrics(
        fromLat: fromLat,
        fromLon: fromLon,
        toLat: toLat,
        toLon: toLon,
      );
      final d = route['distance_km'] as double;
      final t = route['duration_min'] as double;
      final gasolinaFinal = (gasolina ?? 6.0);
      
      final costCar = TravelHelper.calculateCarCost(d, gasolinaFinal);
      final costMoto = TravelHelper.calculateMotoCost(d, gasolinaFinal);

      if (!mounted) return;
      setState(() {
        final id = s['id']?.toString();
        if (id != null) {
          _travelById[id] = {
            'distance': TravelHelper.formatDistance(d),
            'duration': TravelHelper.formatDuration(t),
            'costCar': TravelHelper.formatCost(costCar),
            'costMoto': TravelHelper.formatCost(costMoto),
          };
        }
      });
    } catch (_) {}
  }

  Future<void> _openNavigation(Map<String, dynamic> s) async {
    final toLat = s['latitude'] is num
        ? (s['latitude'] as num).toDouble()
        : double.tryParse('${s['latitude']}');
    final toLon = s['longitude'] is num
        ? (s['longitude'] as num).toDouble()
        : double.tryParse('${s['longitude']}');
    if (toLat == null || toLon == null) return;
    double? fromLat;
    double? fromLon;
    try {
      final serviceOn = await Geolocator.isLocationServiceEnabled();
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (serviceOn &&
          perm != LocationPermission.denied &&
          perm != LocationPermission.deniedForever) {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
          ),
        );
        fromLat = pos.latitude;
        fromLon = pos.longitude;
      }
    } catch (_) {}
    fromLat =
        fromLat ??
        (s['provider_lat'] is num
            ? (s['provider_lat'] as num).toDouble()
            : double.tryParse('${s['provider_lat']}')) ??
        -23.5505;
    fromLon =
        fromLon ??
        (s['provider_lon'] is num
            ? (s['provider_lon'] as num).toDouble()
            : double.tryParse('${s['provider_lon']}')) ??
        -46.6333;
    if (!mounted) return;
    final url =
        'https://www.google.com/maps/dir/?api=1&origin=$fromLat,$fromLon&destination=$toLat,$toLon&travelmode=driving';
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  /*
  void _handleChatMessage(dynamic data) {
    if (!mounted) return;
    setState(() {
      _unreadCount++;
      _bellController.forward(from: 0.0);
      _notifications.insert(0, {
        'title': 'Nova Mensagem',
        'body': data['message'] ?? 'Nova mensagem recebida',
        'time': DateTime.now(),
        'isRead': false,
        'id': data['service_id'] ?? data['id'],
        'type': 'chat_message',
      });
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Nova Mensagem: ${data['message'] ?? ''}'),
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: 'Ver',
          onPressed: () {
            final id = data['service_id'] ?? data['id'];
            if (id != null) {
              context.push('/chat', extra: id.toString());
            }
          },
        ),
      ),
    );
  }
  */

  Widget _buildNotificationAccordion() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Notificações',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              TextButton(
                onPressed: () {
                  _notificationsVN.value = [];
                },
                child: const Text('Limpar'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_notificationsVN.value.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8.0),
              child: Text(
                'Nenhuma notificação recente',
                style: TextStyle(color: Colors.black54),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _notificationsVN.value.length,
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final n = _notificationsVN.value[index];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      LucideIcons.bell,
                      size: 16,
                      color: Colors.orange,
                    ),
                  ),
                  title: Text(
                    n['title'],
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(
                    n['body'],
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onTap: () {
                    if (n['type'] == 'chat_message') {
                      context.push('/chat', extra: n['id'].toString());
                    } else if (n['id'] != null) {
                      context.push('/tracking/${n['id']}');
                    }
                  },
                );
              },
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: Stack(
          children: [
            NestedScrollView(
              headerSliverBuilder: (context, innerBoxIsScrolled) => [
                SliverToBoxAdapter(
                  child: Container(
                    padding: const EdgeInsets.only(
                      top: 60,
                      left: 24,
                      right: 24,
                      bottom: 32,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(32),
                        bottomRight: Radius.circular(32),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => context.push('/provider-profile'),
                            child: Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    image: _avatarBytes != null
                                        ? DecorationImage(
                                            image: MemoryImage(_avatarBytes!),
                                            fit: BoxFit.cover,
                                          )
                                        : null,
                                  ),
                                  child: _avatarBytes == null
                                      ? const Center(
                                          child: Text(
                                            'P',
                                            style: TextStyle(
                                              color: Colors.black,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 12),
                                Flexible(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Olá,',
                                        style: TextStyle(color: Colors.black54),
                                      ),
                                      Text(
                                        _userName ?? 'Prestador',
                                        style: const TextStyle(
                                          color: Colors.black87,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(
                                    LucideIcons.bell,
                                    color: Colors.black87,
                                  ),
                                  onPressed: () =>
                                      context.push('/notifications'),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Saldo disponível',
                                  style: TextStyle(color: Colors.black54),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.wallet,
                                  color: Colors.black87,
                                  size: 20,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'R\$ 0,00',
                                  style: TextStyle(
                                    color: Colors.black87,
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                if (_isNotificationsOpen)
                  SliverToBoxAdapter(child: _buildNotificationAccordion()),
                SliverToBoxAdapter(
                  child: _notifText != null
                      ? Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24.0,
                            vertical: 8,
                          ),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: Theme.of(
                                  context,
                                ).colorScheme.secondary.withValues(alpha: 0.3),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .secondary
                                        .withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Text(
                                    '🆕',
                                    style: TextStyle(fontSize: 20),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Nova oportunidade!',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _notifText!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: Colors.grey,
                                          fontSize: 12,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      ElevatedButton(
                                        onPressed: () async {
                                          final id =
                                              (_availableServices.isNotEmpty)
                                              ? _availableServices.first['id']
                                              : null;
                                          if (id != null) {
                                            await context.push(
                                              '/service-details',
                                              extra: id.toString(),
                                            );
                                            if (mounted) {
                                              _loadData();
                                            }
                                          }
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Theme.of(
                                            context,
                                          ).primaryColor,
                                          foregroundColor: Colors.white,
                                          minimumSize: const Size(220, 46),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                          ),
                                        ),
                                        child: const Text('Ver detalhes'),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
                if (!_isFixedLocation)
                  SliverPersistentHeader(
                    pinned: true,
                    delegate: _SliverAppBarDelegate(
                      TabBar(
                        controller: _tabController,
                        labelColor: Colors.black,
                        unselectedLabelColor: Colors.grey[600],
                        labelStyle: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                        unselectedLabelStyle: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w400,
                        ),
                        indicatorColor: Colors.black,
                        indicatorWeight: 3,
                        indicatorSize: TabBarIndicatorSize.label,
                        tabs: const [
                          Tab(text: 'Meus'),
                          Tab(text: 'Disponíveis'),
                          Tab(text: 'Finalizados'),
                        ],
                      ),
                    ),
                  ),
              ],
              body: _isFixedLocation 
                ? _buildUnifiedSchedule()
                : ValueListenableBuilder<bool>(
                valueListenable: _isLoadingVN,
                builder: (context, isLoading, _) {
                  if (isLoading) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                      child: Column(
                        children: List.generate(
                          3,
                          (index) => const Padding(
                            padding: EdgeInsets.only(bottom: 12),
                            child: CardSkeleton(),
                          ),
                        ),
                      ),
                    );
                  }
                  return TabBarView(
                    controller: _tabController,
                    children: [
                            _buildServiceList(
                              _myServices
                                  .where(
                                    (s) =>
                                        s['status'] == 'accepted' ||
                                        s['status'] == 'in_progress' ||
                                        s['status'] == 'inProgress' ||
                                        s['status'] == 'waiting_client_confirmation',
                                  )
                                  .toList(),
                            ),
                            _buildServiceList(
                              _availableServices,
                              isAvailable: true,
                            ),
                            _buildServiceList(
                              _myServices
                                  .where(
                                    (s) =>
                                        s['status'] == 'completed' ||
                                        s['status'] == 'cancelled' ||
                                        s['status'] == 'waiting_client_confirmation',
                                  )
                                  .toList(),
                            ),
                          ],
                  );
                },
              ),
            ),
            // Removed floating Positioned notification to avoid web semantics/pointer issues.
          ],
        ),
      ),
    );
  }

  Widget _buildUnifiedSchedule() {
    return Column(
      children: [
        _buildPainelHeader(),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => _loadSchedule(_selectedDate),
            child: _loadingSlots 
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      childAspectRatio: 1.4,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: 12,
                    itemBuilder: (context, index) => const BaseSkeleton(),
                  ),
                )
              : _buildScheduleGrid(),
          ),
        ),
      ],
    );
  }

  Widget _buildPainelHeader() {
    return Container(
      padding: const EdgeInsets.only(top: 16, bottom: 8),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Painel de Serviços',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
          ),
          const SizedBox(height: 16),
          _buildPainelNavigation(),
        ],
      ),
    );
  }

  Widget _buildPainelNavigation() {
    return Row(
      children: [
        _buildTodayTabButton(),
        Expanded(child: _buildPainelDateSelector()),
      ],
    );
  }

  Widget _buildTodayTabButton() {
    final nowBr = DateTime.now().toUtc().subtract(const Duration(hours: 3));
    final isSelected = _selectedDate.day == nowBr.day && 
                      _selectedDate.month == nowBr.month && 
                      _selectedDate.year == nowBr.year;

    return Container(
      width: 120,
      margin: const EdgeInsets.only(left: 24),
      child: Column(
        children: [
          InkWell(
            onTap: () {
              setState(() {
                _selectedDate = nowBr;
              });
              _loadSchedule(_selectedDate);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text(
                  'Hoje',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                    color: isSelected ? Colors.black : Colors.grey[400],
                  ),
                ),
              ),
            ),
          ),
          if (isSelected)
            Container(
              height: 2,
              width: 50,
              color: Colors.black,
            ),
        ],
      ),
    );
  }

  Widget _buildPainelDateSelector() {
    return SizedBox(
      height: 90,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        scrollDirection: Axis.horizontal,
        itemCount: 14,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final nowBr = DateTime.now().toUtc().subtract(const Duration(hours: 3));
          final date = nowBr.add(Duration(days: index + 1));
          final isSelected = date.day == _selectedDate.day && 
                            date.month == _selectedDate.month &&
                            date.year == _selectedDate.year;
          
          final dayName = index == 0 ? "Amanhã" : _getDayName(date.weekday);
          
          return Center(
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedDate = date;
                });
                _loadSchedule(_selectedDate);
              },
              child: Container(
                width: 75,
                height: 75,
                decoration: BoxDecoration(
                  color: isSelected ? Theme.of(context).primaryColor : Colors.grey[50],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? Theme.of(context).primaryColor : Colors.grey[200]!,
                    width: 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      dayName,
                      style: TextStyle(
                        fontSize: 11,
                        color: isSelected ? Colors.black : Colors.grey[600],
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "${date.day}/${date.month}",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: isSelected ? Colors.black : Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildScheduleGrid() {
    if (_loadingSlots) {
      return const Center(child: Text("Carregando agenda..."));
    }

    // Simplified: Just trust the UTC comparison. 
    // Backend returns -03:00 offset, DateTime.parse handles it.
    final nowUtc = DateTime.now().toUtc();
    final List<Map<String, dynamic>> filteredSlots = _slots.where((slot) {
      final endTimeStr = slot['end_time']?.toString();
      if (endTimeStr == null) return false;
      
      final end = DateTime.tryParse(endTimeStr);
      if (end == null) return false;
      
      return end.toUtc().isAfter(nowUtc);
    }).toList();

    if (filteredSlots.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.calendarX, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              _slots.isEmpty 
                  ? "Nenhum horário configurado." 
                  : "Não há mais horários para hoje.",
              style: const TextStyle(color: Colors.grey, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              _slots.isEmpty
                  ? "Verifique sua configuração de dias e horários."
                  : "Você completou seu expediente ou o estabelecimento está fechado.",
              style: const TextStyle(color: Colors.grey, fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: () => _loadSchedule(_selectedDate),
              icon: const Icon(Icons.refresh),
              label: const Text("Atualizar"),
            ),
          ],
        ),
      );
    }

    // Sort slots by time
    final sortedSlots = List<Map<String, dynamic>>.from(filteredSlots);
    sortedSlots.sort((a, b) {
      final t1 = DateTime.tryParse(a['start_time'].toString()) ?? DateTime.now();
      final t2 = DateTime.tryParse(b['start_time'].toString()) ?? DateTime.now();
      return t1.compareTo(t2);
    });

    if (sortedSlots.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.checkCircle2, size: 64, color: Colors.green),
            const SizedBox(height: 16),
            const Text(
              "Expediente finalizado!",
              style: TextStyle(color: Colors.black87, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Você já concluiu todos os horários de hoje.",
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => _tabController.animateTo(1),
              child: const Text("Ver próximos dias"),
            )
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 1.4,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: sortedSlots.length,
      itemBuilder: (context, index) {
        final slot = sortedSlots[index];
        final status = slot['status']; // free, busy, booked

        final nowUtc = DateTime.now().toUtc();
        final start = DateTime.parse(slot['start_time']).toUtc();
        final end = DateTime.parse(slot['end_time']).toUtc();

        final isCurrent = nowUtc.isAfter(start.subtract(const Duration(minutes: 1))) && 
                          nowUtc.isBefore(end);

        final nowBr = nowUtc.subtract(const Duration(hours: 3));
        final isFixedDayToday = _selectedDate.day == nowBr.day && 
                               _selectedDate.month == nowBr.month && 
                               _selectedDate.year == nowBr.year;

        final isActuallyNow = isCurrent && isFixedDayToday;

        Color borderColor = const Color(0xFF4CAF50); // Green
        Color textColor = const Color(0xFF4CAF50);
        Color bgColor = Colors.white;
        String statusLabel = 'Livre';

        if (status == 'busy' || status == 'booked') {
          borderColor = const Color(0xFFE0E0E0);
          textColor = Colors.grey;
          statusLabel = 'Ocupado';
        } else if (status == 'lunch') {
          borderColor = const Color(0xFFFF9800); // Orange
          textColor = const Color(0xFFFF9800);
          bgColor = const Color(0xFFFFF7F0);
          statusLabel = 'Almoço';
        } else if (isActuallyNow) {
          borderColor = const Color(0xFF4CAF50);
          textColor = const Color(0xFF4CAF50);
          bgColor = const Color(0xFFF1FDF1);
          statusLabel = 'AGORA';
        }

        return InkWell(
          onTap: (status == 'lunch' || status == 'busy' || status == 'booked')
              ? null
              : () {
                  _toggleSlotBusy(slot);
                },
          child: Container(
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: borderColor,
                width: isActuallyNow ? 2.5 : 1.5,
              ),
              boxShadow: [
                if (isActuallyNow)
                  BoxShadow(
                    color: const Color(0xFF4CAF50).withValues(alpha: 0.15),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  // Robust display: extract HH:mm directly from the ISO string 
                  // to avoid local timezone shifts during display.
                  slot['start_time'].toString().contains('T') 
                    ? slot['start_time'].toString().split('T')[1].substring(0, 5)
                    : "${DateTime.parse(slot['start_time']).hour.toString().padLeft(2, '0')}:${DateTime.parse(slot['start_time']).minute.toString().padLeft(2, '0')}",
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: status == 'busy' || status == 'booked' ? Colors.grey : Colors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  statusLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }


  Widget _buildServiceList(List<dynamic> items, {bool isAvailable = false}) {
    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isAvailable ? LucideIcons.search : LucideIcons.briefcase,
                size: 64,
                color: Colors.grey[300],
              ),
              const SizedBox(height: 16),
              Text(
                isAvailable 
                  ? 'Nenhuma oportunidade no momento'
                  : 'Você não tem serviços ativos',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black54,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                isAvailable
                  ? 'Fique de olho! Novas solicitações aparecerão aqui assim que surgirem.'
                  : 'Seus serviços aceitos ou em andamento aparecerão nesta lista.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
              if (!isAvailable) ...[
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => _tabController.animateTo(1),
                  child: const Text('Explorar oportunidades'),
                ),
              ],
            ],
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.separated(
        primary: false,
        shrinkWrap: true,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        itemCount: items.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = items[index];
          final price = item['provider_amount'] ?? item['price_estimated'] ?? 0;
          final paymentStatus = (item['payment_remaining_status'] ?? '')
              .toString();
          final arrivedAt = item['arrived_at'];

          return InkWell(
            onTap: () async {
              // Passa o ID para a tela de detalhes
              final id = item['id'];
              if (id != null) {
                await context.push('/service-details', extra: id.toString());
                if (mounted) {
                  _loadData();
                }
              }
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          item['profession'] ??
                              item['category_name'] ??
                              'Serviço',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'R\$ $price',
                              style: TextStyle(
                              color: Colors.black,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 4),
                          _buildStatusBadge(
                            (item['status'] ?? 'pending').toString(),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        LucideIcons.mapPin,
                        size: 14,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          item['address'] ?? '',
                          style: const TextStyle(
                            color: Colors.grey,
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Builder(
                    builder: (context) {
                      _ensureLoadTravelForItem(item);
                      final id = item['id']?.toString();
                      final travel = id != null ? _travelById[id] : null;
                      if (travel == null) {
                        return const SizedBox.shrink();
                      }
                      return Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          if (travel['distance'] != null &&
                              travel['duration'] != null)
                            Text(
                              'Distância: ${travel['distance']} km • Tempo: ${travel['duration']} min',
                              style: const TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                          if (isAvailable)
                            TextButton.icon(
                              onPressed: () => _openNavigation(item),
                              icon: const Icon(Icons.navigation),
                              label: const Text('Rota'),
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: const Size(0, 0),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                  if (item['status'] == 'in_progress') ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          final id = item['id']?.toString();
                          if (id != null) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    FinishServiceScreen(serviceId: id),
                              ),
                            ).then((result) {
                              if (result == true) {
                                if (mounted) _loadData();
                              }
                            });
                          }
                        },
                        icon: const Icon(Icons.check_circle, size: 16),
                        label: const Text('Encerrar serviço'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black87,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ] else if (paymentStatus == 'paid' && 
                             item['status'] != 'waiting_client_confirmation' && 
                             item['status'] != 'completed') ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          final id = item['id']?.toString();
                          if (id != null) {
                            await _startService(id);
                          }
                        },
                        icon: const Icon(LucideIcons.play, size: 16),
                        label: const Text('Iniciar serviço'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2968C8),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Função de editar serviço estará disponível em breve.',
                              ),
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.black87,
                          side: BorderSide(color: Colors.grey.shade400),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('Editar serviço'),
                      ),
                    ),
                  ] else if (item['status'] == 'accepted') ...[
                    const SizedBox(height: 12),
                    if (arrivedAt == null)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            final id = item['id']?.toString();
                            if (id != null) {
                              _handleArrived(id);
                            }
                          },
                          icon: const Icon(LucideIcons.mapPin, size: 16),
                          label: const Text('Cheguei no Local'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      )
                    else if (paymentStatus != 'paid')
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(
                          child: Text(
                            'Aguardando cliente/pagamento',
                            style: TextStyle(
                              color: Colors.black87,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _startService(String id) async {
    setState(() => _isLoadingVN.value = true);
    try {
      await _api.startService(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Serviço iniciado!'),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro ao iniciar serviço: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingVN.value = false);
      }
    }
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    String text;
    switch (status) {
      case 'inProgress':
      case 'in_progress':
        color = Colors.orange;
        text = 'Em andamento';
        break;
      case 'accepted':
        color = Colors.blue;
        text = 'Aceito';
        break;
      case 'completed':
        color = Colors.green;
        text = 'Concluído';
        break;
      case 'cancelled':
        color = Colors.red;
        text = 'Cancelado';
        break;
      case 'waiting_client_confirmation':
        color = Colors.purple;
        text = 'Aguardando confirmação';
        break;
      default:
        color = Colors.grey;
        text = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _getDayName(int weekday) {
    switch (weekday) {
      case 1: return "Seg";
      case 2: return "Ter";
      case 3: return "Qua";
      case 4: return "Qui";
      case 5: return "Sex";
      case 6: return "Sáb";
      case 7: return "Dom";
      default: return "";
    }
  }
}
