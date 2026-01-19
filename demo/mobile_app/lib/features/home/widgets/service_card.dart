import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/theme/app_theme.dart';
import '../../../services/api_service.dart';
import '../../profile/provider_profile_screen.dart';

class ServiceCard extends StatefulWidget {
  final String status;
  final String providerName;
  final String distance;
  final String category;
  final Map<String, dynamic>? details;
  final ValueChanged<bool>? onExpandChange;
  final bool? expanded;
  final bool showExpandIcon;
  final VoidCallback? onCancel;
  final VoidCallback? onTrack;
  final VoidCallback? onArrived;
  final VoidCallback? onPay;
  final VoidCallback? onRate;

  const ServiceCard({
    super.key,
    required this.status,
    required this.providerName,
    required this.distance,
    required this.category,
    this.details,
    this.onExpandChange,
    this.expanded,
    this.onCancel,
    this.onTrack,
    this.onArrived,
    this.onPay,
    this.onRate,
    this.showExpandIcon = true,
  });

  @override
  State<ServiceCard> createState() => _ServiceCardState();
}

class _ServiceCardState extends State<ServiceCard>
    with TickerProviderStateMixin {
  bool _expanded = false;
  String? _providerAvatarUrl;
  Uint8List? _providerAvatarBytes;

  double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    if (v is String) {
      var s = v.trim();
      if (RegExp(r'^\d{1,3}(\.\d{3})+(,\d+)$').hasMatch(s)) {
        s = s.replaceAll('.', '').replaceAll(',', '.');
      } else if (s.contains(',') && !s.contains('.')) {
        s = s.replaceAll(',', '.');
      }
      var parsed = double.tryParse(s);
      if (parsed != null) return parsed;
      s = s.replaceAll(RegExp(r'[^0-9\.-]'), '');
      return double.tryParse(s);
    }
    return null;
  }

  DateTime? _toDate(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v.toLocal();
    if (v is String) {
      String s = v.trim();
      if (s.contains(' ') && !s.contains('T') && !s.contains('Z')) {
        s = '${s.replaceFirst(' ', 'T')}Z';
      }
      return DateTime.tryParse(s)?.toLocal();
    }
    if (v is num) {
      final n = v.toInt();
      DateTime dt;
      if (n > 1000000000000) {
        dt = DateTime.fromMillisecondsSinceEpoch(n, isUtc: true);
      } else {
        dt = DateTime.fromMillisecondsSinceEpoch(n * 1000, isUtc: true);
      }
      return dt.toLocal();
    }
    return null;
  }

  Color _getStatusColor(BuildContext context) {
    return Theme.of(context).colorScheme.secondary;
  }

  String getStatusText() {
    // Check for arrived_at in details
    final arrivedAt = widget.details?['arrived_at'];
    final paymentStatus = widget.details?['payment_remaining_status'];

    if (arrivedAt != null &&
        paymentStatus != 'paid' &&
        ['accepted', 'in_progress', 'inProgress'].contains(widget.status)) {
      return 'Pagar Restante';
    }

    switch (widget.status) {
      case 'accepted':
        // User wants to show distance when accepted
        return widget.distance.isNotEmpty && widget.distance != '---'
            ? 'Distância: ${widget.distance}'
            : 'A caminho';
      case 'inProgress':
      case 'in_progress':
        return 'Aguardando finalização';
      case 'waiting_remaining_payment':
        return 'Aguardando pagamento restante';
      case 'completed':
        return 'Serviço concluído';
      case 'waiting_client_confirmation':
        return 'Aguardando confirmação do cliente';
      case 'pending':
      // Se for presencial no prestador ou tiver prestador fixo, dizer "Agendado"
      final isAtProvider = widget.details?['location_type'] == 'provider';
      final hasSpecificProvider = widget.details?['provider_id'] != null;
      if (isAtProvider || hasSpecificProvider) {
        return 'Agendado';
      }
      return 'Aguardando prestador';
      case 'waiting_payment':
      case 'arrived': // Handle arrived as waiting payment if needed
        return 'Aguardando pagamento';
      case 'searching':
        return 'Buscando prestador';
      case 'open':
        return 'Aberto';
      case 'cancelled':
        return 'Cancelado';
      default:
        return widget.status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = widget.details ?? {};
    final desc = (detail['description'] ?? widget.category).toString();
    final priceEstimated = _toDouble(detail['price_estimated']);
    final priceUpfront = _toDouble(detail['price_upfront']);
    String dateText = '';
    final createdDt = _toDate(detail['created_at']);
    if (createdDt != null) {
      final d = createdDt.toLocal();
      dateText =
          '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    }
    final isExpanded = widget.expanded ?? _expanded;

    // DEFINA UMA COR FIXA PARA A BORDA:
    final borderColor =
        ['accepted', 'scheduled', 'confirmed'].contains(widget.status)
        ? Theme.of(context).primaryColor
        : Colors.grey.shade300;

    final bool hasProvider = widget.providerName != 'Aguardando...' && widget.providerName.isNotEmpty;

    return InkWell(
      onTap: () {
        if (widget.onExpandChange != null) {
          widget.onExpandChange!.call(!isExpanded);
        } else {
          setState(() => _expanded = !isExpanded);
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: AnimatedSize(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          // Removed fixed width to allow parent to control it
          padding: EdgeInsets.all(isExpanded ? 12 : 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                offset: const Offset(0, 4),
                blurRadius: 12,
              ),
            ],
          ),
          child: SingleChildScrollView(
            physics:
                const NeverScrollableScrollPhysics(), // Prevent conflict with parent list
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getStatusColor(context).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        getStatusText(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: _getStatusColor(context),
                        ),
                      ),
                    ),
                    if (widget.showExpandIcon)
                      Icon(
                        isExpanded ? Icons.expand_less : Icons.expand_more,
                        size: 20,
                        color: Colors.grey[600],
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  widget.category,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                // Conditional rendering for Provider Info or "Waiting" status
                if ([
                  'pending',
                  'waiting_payment',
                  'open',
                  'searching',
                ].contains(widget.status) && !hasProvider)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Row(
                      children: [
                        const Icon(
                          LucideIcons.loader,
                          size: 16,
                          color: Colors.grey,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Aguardando prestador...',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: InkWell(
                      onTap: () {
                        final pId = widget.details?['provider_id'];
                        if (pId != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ProviderProfileScreen(providerId: pId),
                            ),
                          );
                        }
                      },
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircleAvatar(
                            radius: 12,
                            backgroundColor: Colors.grey,
                            backgroundImage: _providerAvatarBytes != null
                                ? MemoryImage(_providerAvatarBytes!)
                                : (_providerAvatarUrl != null
                                          ? CachedNetworkImageProvider(
                                              _providerAvatarUrl!,
                                            )
                                          : null)
                                      as ImageProvider?,
                            child:
                                (_providerAvatarBytes == null &&
                                    _providerAvatarUrl == null)
                                ? const Icon(
                                    Icons.person,
                                    size: 16,
                                    color: Colors.white,
                                  )
                                : null,
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              widget.providerName,
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[700],
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.chevron_right, size: 14, color: Colors.grey),
                        ],
                      ),
                    ),
                  ),

                // For Horizontal Card (Compact Mode): Show Date/Price always
                if (!widget.showExpandIcon && !isExpanded) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.schedule, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        dateText.isNotEmpty
                            ? dateText.split(' ')[0]
                            : '--/--/--',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.black87,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        priceEstimated != null
                            ? 'R\$ ${priceEstimated.toStringAsFixed(2)}'
                            : 'R\$ --',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryPurple,
                        ),
                      ),
                    ],
                  ),
                ],

                AnimatedCrossFade(
                  duration: const Duration(milliseconds: 250),
                  crossFadeState: isExpanded
                      ? CrossFadeState.showSecond
                      : CrossFadeState.showFirst,
                  firstChild: const SizedBox(height: 0),
                  secondChild: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 12),
                      Text(
                        desc,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.black87,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.attach_money,
                                size: 18,
                                color: AppTheme.primaryPurple,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                priceEstimated != null
                                    ? 'Estimado: R\$ ${priceEstimated.toStringAsFixed(2)}'
                                    : 'Estimado: --',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.black87,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            priceUpfront != null
                                ? 'Entrada: R\$ ${priceUpfront.toStringAsFixed(2)}'
                                : 'Entrada: --',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.black87,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.schedule,
                            size: 18,
                            color: AppTheme.primaryPurple,
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              dateText.isNotEmpty ? dateText : '--',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.black87,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (createdDt != null) ...[
                            const SizedBox(width: 8),
                            _ServiceTimer(startTime: createdDt),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                // Status Button (Always visible for relevant states)
                if (widget.status == 'waiting_client_confirmation') ...[
                  const SizedBox(height: 12),
                  if (ApiService().role == 'provider') ...[
                    // Provider view: Countdown
                    _WaitingConfirmationTimer(
                      startTime: _toDate(detail['status_updated_at']) ?? DateTime.now(),
                    ),
                  ] else ...[
                    // Client view: Confirmation buttons
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => _confirmDirectly(context, detail['id']),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Confirmar direto', style: TextStyle(fontSize: 12)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              final id = detail['id']?.toString();
                              if (id != null) {
                                context.push('/service-verification/$id');
                              }
                            },
                            child: const Text('Ver detalhes', style: TextStyle(fontSize: 12)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ] else if ([
                  'accepted',
                  'waiting_payment',
                  'completed',
                  'in_progress',
                  'pending',
                  'searching',
                ].contains(widget.status)) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        final statusText = getStatusText();

                        // Navigation for Scheduled Services (Fixed Provider)
                        if (statusText == 'Agendado') {
                          final id = widget.details?['id'];
                          if (id != null) {
                            context.push('/scheduled-service/$id');
                          }
                          return;
                        }

                        if ((widget.status == 'waiting_payment' || statusText == 'Pagar Restante') &&
                            widget.onPay != null) {
                          widget.onPay!();
                        } else if (widget.status == 'completed' &&
                            widget.onRate != null) {
                          widget.onRate!();
                        } else if (widget.onTrack != null) {
                          widget.onTrack!();
                        }
                      },
                      child: Text(
                        getStatusText(),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],

                if (widget.onCancel != null &&
                    [
                      'pending',
                      'open',
                      'searching',
                      'waiting_payment',
                    ].contains(widget.status)) ...[
                  const SizedBox(height: 8),
                  Divider(color: Colors.grey[200], height: 16),
                  Center(
                    child: TextButton(
                      onPressed: widget.onCancel,
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.red[300],
                        minimumSize: const Size(0, 32),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        padding: const EdgeInsets.symmetric(
                          vertical: 4,
                          horizontal: 8,
                        ),
                      ),
                      child: const Text(
                        'Cancelar solicitação',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDirectly(BuildContext context, dynamic serviceId) async {
    try {
      if (serviceId == null) return;
      final api = ApiService();
      final res = await api.post('/services/$serviceId/confirm-final', {});
      if (res['success'] == true) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Serviço confirmado com sucesso!')),
          );
          // Opcional: recarregar lista
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao confirmar: $e')),
        );
      }
    }
  }

  @override
  void setState(VoidCallback fn) {
    super.setState(fn);
    if (widget.onExpandChange != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        widget.onExpandChange!.call(widget.expanded ?? _expanded);
      });
    }
  }

  @override
  void didUpdateWidget(ServiceCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.expanded != null && widget.expanded != oldWidget.expanded) {
      _expanded = widget.expanded!;
    }
    if (widget.details != oldWidget.details) {
      resolveProviderAvatar();
    }
  }

  @override
  void initState() {
    super.initState();
    resolveProviderAvatar();
  }

  Future<void> resolveProviderAvatar() async {
    try {
      final d = widget.details ?? {};
      final raw =
          d['provider_avatar'] ??
          d['provider_avatar_url'] ??
          d['providerPhoto'] ??
          d['provider_photo'];
      final key =
          d['provider_avatar_key'] ??
          d['providerAvatarKey'] ??
          d['provider_avatarKey'];

      String? url;
      Uint8List? bytes;

      final api = ApiService();

      if (raw is String && raw.startsWith('http')) {
        url = raw;
      } else if (raw is String && raw.isNotEmpty) {
        bytes = await api.getMediaBytes(raw);
      } else if (key is String && key.isNotEmpty) {
        bytes = await api.getMediaBytes(key);
      }

      if (!mounted) return;
      setState(() {
        _providerAvatarUrl = url;
        _providerAvatarBytes = bytes;
      });
    } catch (_) {}
  }
}

class _ServiceTimer extends StatefulWidget {
  final DateTime startTime;
  const _ServiceTimer({required this.startTime});

  @override
  State<_ServiceTimer> createState() => _ServiceTimerState();
}

class _ServiceTimerState extends State<_ServiceTimer> {
  late Timer timer;
  Duration elapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    updateTime();
    timer = Timer.periodic(const Duration(seconds: 1), (_) => updateTime());
  }

  void updateTime() {
    if (!mounted) return;
    setState(() {
      elapsed = DateTime.now().difference(widget.startTime);
      if (elapsed.isNegative) {
        elapsed = Duration.zero;
      }
    });
  }

  @override
  void dispose() {
    timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = twoDigits(elapsed.inHours);
    final minutes = twoDigits(elapsed.inMinutes.remainder(60));
    final seconds = twoDigits(elapsed.inSeconds.remainder(60));

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.green.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        '$hours:$minutes:$seconds',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.green[700],
        ),
      ),
    );
  }
}

class _WaitingConfirmationTimer extends StatefulWidget {
  final DateTime startTime;
  const _WaitingConfirmationTimer({required this.startTime});

  @override
  State<_WaitingConfirmationTimer> createState() => _WaitingConfirmationTimerState();
}

class _WaitingConfirmationTimerState extends State<_WaitingConfirmationTimer> {
  late Timer timer;
  Duration remaining = const Duration(minutes: 30);

  @override
  void initState() {
    super.initState();
    updateTime();
    timer = Timer.periodic(const Duration(seconds: 1), (_) => updateTime());
  }

  void updateTime() {
    if (!mounted) return;
    final deadline = widget.startTime.add(const Duration(minutes: 30));
    final now = DateTime.now();
    setState(() {
      remaining = deadline.difference(now);
      if (remaining.isNegative) {
        remaining = Duration.zero;
      }
    });
  }

  @override
  void dispose() {
    timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(remaining.inMinutes);
    final seconds = twoDigits(remaining.inSeconds.remainder(60));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Pagamento será liberado automaticamente em:',
          style: TextStyle(fontSize: 11, color: Colors.grey),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.blue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.timer, size: 16, color: Colors.blue),
              const SizedBox(width: 8),
              Text(
                '$minutes:$seconds',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
