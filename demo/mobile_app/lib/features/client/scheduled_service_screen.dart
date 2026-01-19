import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

class ScheduledServiceScreen extends StatefulWidget {
  final String serviceId;

  const ScheduledServiceScreen({super.key, required this.serviceId});

  @override
  State<ScheduledServiceScreen> createState() => _ScheduledServiceScreenState();
}

class _ScheduledServiceScreenState extends State<ScheduledServiceScreen> {
  final ApiService _api = ApiService();
  bool _isLoading = true;
  Map<String, dynamic>? _service;

  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadService();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) => _loadService(silent: true));
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadService({bool silent = false}) async {
    try {
      final data = await _api.getServiceDetails(widget.serviceId);
      if (mounted) {
        setState(() {
          _service = data;
          if (!silent) _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading service: $e');
      if (mounted && !silent) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar agendamento: $e')),
        );
      }
    }
  }

  Future<void> _openMap() async {
    final lat = double.tryParse(_service?['provider_lat']?.toString() ?? '');
    final lon = double.tryParse(_service?['provider_lon']?.toString() ?? '');
    
    if (lat != null && lon != null) {
      final nativeUri = Uri.parse('google.navigation:q=$lat,$lon');
      final webUri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lon');
      
      try {
        if (await canLaunchUrl(nativeUri)) {
          await launchUrl(nativeUri);
        } else {
          await launchUrl(webUri, mode: LaunchMode.externalApplication);
        }
      } catch (_) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    }
  }

  Future<void> _cancelService() async {
     final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar Agendamento?'),
        content: const Text('Tem certeza que deseja cancelar este serviço?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Não'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Sim, Cancelar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _api.cancelService(widget.serviceId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Agendamento cancelado.')),
          );
          context.pop(); // Back to home
        }
      } catch (e) {
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao cancelar: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Detalhes do Agendamento')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_service == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Detalhes do Agendamento')),
        body: const Center(child: Text('Agendamento não encontrado.')),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Agendamento'),
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          onPressed: () => context.pop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadService(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _buildStatusCard(),
              const SizedBox(height: 24),
              _buildMapSection(),
              const SizedBox(height: 24),
              _buildProviderInfo(),
              const SizedBox(height: 24),
              _buildActions(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    final scheduledAtStr = _service?['scheduled_at'];
    DateTime? scheduledAt;
    if (scheduledAtStr != null) {
      scheduledAt = DateTime.tryParse(scheduledAtStr);
    }

    return Container(
      padding: const EdgeInsets.all(20),
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
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryYellow.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              LucideIcons.calendarCheck,
              size: 40,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Agendamento Confirmado',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          if (scheduledAt != null)
             Text(
              '${scheduledAt.day}/${scheduledAt.month} às ${scheduledAt.hour.toString().padLeft(2, '0')}:${scheduledAt.minute.toString().padLeft(2, '0')}',
               style: const TextStyle(fontSize: 16, color: Colors.grey),
             ),
           const SizedBox(height: 24),
           // Time to leave calculation
           _buildTimeToLeave(scheduledAt),
        ],
      ),
    );
  }

  Widget _buildTimeToLeave(DateTime? scheduledAt) {
     if (scheduledAt == null) return const SizedBox.shrink();
     
     // Use Real Backend Calculation (or default 30)
     final travelTime = int.tryParse(_service?['travel_time_min']?.toString() ?? '30') ?? 30;
     final leaveAt = scheduledAt.subtract(Duration(minutes: travelTime));
     final now = DateTime.now();
     
     final isLate = now.isAfter(leaveAt);
     final timeStr = '${leaveAt.hour.toString().padLeft(2, '0')}:${leaveAt.minute.toString().padLeft(2, '0')}';

     final bgColor = isLate ? Colors.red[50] : Colors.blue[50];
     final textColor = isLate ? Colors.red : Colors.blue;
     final message = isLate ? 'Saia agora! ($timeStr)' : 'Saia de casa às $timeStr';
     final icon = isLate ? LucideIcons.alertTriangle : LucideIcons.clock;

     return Container(
       padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
       decoration: BoxDecoration(
         color: bgColor,
         borderRadius: BorderRadius.circular(12),
       ),
       child: Row(
         mainAxisSize: MainAxisSize.min,
         children: [
           Icon(icon, color: textColor, size: 20),
           const SizedBox(width: 8),
           Text(
             message,
             style: TextStyle(
               color: textColor,
               fontWeight: FontWeight.bold,
             ),
           ),
         ],
       ),
     );
  }

  Widget _buildMapSection() {
    final clientLat = double.tryParse(_service?['latitude']?.toString() ?? '');
    final clientLon = double.tryParse(_service?['longitude']?.toString() ?? '');
    final providerLat = double.tryParse(_service?['provider_lat']?.toString() ?? '');
    final providerLon = double.tryParse(_service?['provider_lon']?.toString() ?? '');

    if (clientLat == null || clientLon == null || providerLat == null || providerLon == null) {
      return const SizedBox.shrink();
    }

    final centerLat = (clientLat + providerLat) / 2;
    final centerLon = (clientLon + providerLon) / 2;

    return Column(
      children: [
        Container(
          height: 220,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: LatLng(centerLat, centerLon),
                initialZoom: 13,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.cardapyia.service',
                ),
                PolylineLayer(
                  polylines: <Polyline>[
                    Polyline(
                      points: [
                        LatLng(clientLat, clientLon),
                        LatLng(providerLat, providerLon),
                      ],
                      strokeWidth: 3,
                      color: AppTheme.primaryPurple,
                    ),
                  ],
                ),
                MarkerLayer(markers: [
                  Marker(
                    point: LatLng(clientLat, clientLon),
                    width: 40,
                    height: 40,
                    child: const Icon(Icons.person_pin_circle, color: Colors.blue, size: 40),
                  ),
                  Marker(
                    point: LatLng(providerLat, providerLon),
                    width: 40,
                    height: 40,
                    child: const Icon(Icons.location_on, color: Colors.red, size: 40),
                  ),
                ]),
              ],
            ),
          ),
        ),

        const SizedBox(height: 12),
        if (_service?['provider_address'] != null)
          Text(
            _service!['provider_address'],
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
            textAlign: TextAlign.center,
          ),
        if (_service?['travel_distance_km'] != null) ...[
           const SizedBox(height: 8),
           Row(
             mainAxisAlignment: MainAxisAlignment.center,
             children: [
               Icon(LucideIcons.mapPin, size: 16, color: AppTheme.primaryPurple),
               const SizedBox(width: 4),
               Text(
                 '${_service!['travel_distance_km']} km • ~${_service?['travel_time_min'] ?? 30} min',
                 style: const TextStyle(fontWeight: FontWeight.bold),
               ),
             ],
           ),
        ],
      ],
    );
  }

  Widget _buildProviderInfo() {
    final name = _service?['provider_name']?.toString() ?? 'Prestador';
    final avatarUrl = _service?['provider_avatar']?.toString();

    return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
               color: Colors.white,
               borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppTheme.primaryPurple,
                  backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty) 
                      ? NetworkImage(avatarUrl) 
                      : null,
                  child: (avatarUrl != null && avatarUrl.isNotEmpty) 
                      ? null 
                      : Text(
                          name.substring(0,1).toUpperCase(),
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
                const Text(
                  'Profissional', 
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 16, 
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              context.push('/chat', extra: widget.serviceId);
            }, 
            icon: const Icon(LucideIcons.messageCircle, color: Colors.green),
            style: IconButton.styleFrom(
              backgroundColor: Colors.green[50], 
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(LucideIcons.map),
            label: const Text('Abrir no Maps'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.black87,
              elevation: 0,
              side: BorderSide(color: Colors.grey[300]!),
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            onPressed: _openMap,
          ),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: _cancelService,
          style: TextButton.styleFrom(
            foregroundColor: Colors.red[300],
          ),
          child: const Text('Cancelar Agendamento'),
        ),
      ],
    );
  }
}
