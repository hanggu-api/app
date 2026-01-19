import 'dart:convert';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:path_provider/path_provider.dart';
import 'package:video_player/video_player.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/widgets/custom_alert.dart';
import '../../../services/api_service.dart';
import '../../../widgets/skeleton_loader.dart';

class ServiceOfferModal extends StatefulWidget {
  final String serviceId;
  final Map<String, dynamic>? initialData;
  final VoidCallback? onAccepted;
  final VoidCallback? onRejected;

  const ServiceOfferModal({
    super.key,
    required this.serviceId,
    this.initialData,
    this.onAccepted,
    this.onRejected,
  });

  @override
  State<ServiceOfferModal> createState() => _ServiceOfferModalState();
}

class _ServiceOfferModalState extends State<ServiceOfferModal> {
  final _api = ApiService();
  final MapController _mapController = MapController();

  Map<String, dynamic>? _serviceData;
  bool _isLoadingDetails = true;

  List<LatLng> _routePoints = [];
  String _routeDistance = '--';
  bool _isLoadingAction = false;

  // Media State
  List<String> _photoUrls = [];
  List<String> _audioKeys = [];
  VideoPlayerController? _videoController;
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isAudioPlaying = false;
  String? _playingAudioKey;
  String? _loadingAudioKey;
  Duration _audioDuration = Duration.zero;
  Duration _audioPosition = Duration.zero;

  @override
  void initState() {
    super.initState();
    _serviceData = widget.initialData;
    if (_serviceData != null && _serviceData!.containsKey('latitude')) {
      _isLoadingDetails = false;
      _loadRoute();
      _loadMedia();
    } else {
      _loadDetails();
    }
    _setupAudioPlayer();
  }

  Future<void> _loadDetails() async {
    try {
      final data = await _api.getServiceDetails(widget.serviceId);
      if (mounted) {
        setState(() {
          _serviceData = data;
          _isLoadingDetails = false;
        });
        _loadRoute();
        _loadMedia();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingDetails = false);
        // Show error or close?
      }
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  void _setupAudioPlayer() {
    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _isAudioPlaying = false;
          _audioPosition = Duration.zero;
        });
      }
    });

    _audioPlayer.onDurationChanged.listen((d) {
      if (mounted) setState(() => _audioDuration = d);
    });

    _audioPlayer.onPositionChanged.listen((p) {
      if (mounted) setState(() => _audioPosition = p);
    });
  }

  Future<void> _loadRoute() async {
    try {
      final s = _serviceData!;
      // Coordinates from service (Destination)
      final destLat = double.tryParse(s['latitude']?.toString() ?? '0') ?? 0;
      final destLng = double.tryParse(s['longitude']?.toString() ?? '0') ?? 0;

      // Coordinates from provider (Origin) - usually passed in data or we assume current
      // Ideally the offer data contains distance/duration pre-calculated, but if not we calc it.
      // If we don't have provider lat/lon in data, we can't easily draw route without geolocation permission here.
      // For a modal, maybe just showing the destination marker is enough if we can't get current loc quickly?
      // Let's try to use the data if available.

      final provLat =
          double.tryParse(s['provider_lat']?.toString() ?? '0') ?? 0;
      final provLon =
          double.tryParse(s['provider_lon']?.toString() ?? '0') ?? 0;

      if (destLat == 0 || destLng == 0 || provLat == 0 || provLon == 0) {
        // setState(() => _isLoadingRoute = false);
        return;
      }

      final url = Uri.parse(
        'http://router.project-osrm.org/route/v1/driving/$provLon,$provLat;$destLng,$destLat?overview=full&geometries=geojson',
      );

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['routes'] != null && (data['routes'] as List).isNotEmpty) {
          final route = data['routes'][0];
          final geometry = route['geometry'];
          final coordinates = geometry['coordinates'] as List;

          final points = coordinates
              .map((c) => LatLng(c[1].toDouble(), c[0].toDouble()))
              .toList();

          final distanceMeters = route['distance'] as num;
          // final durationSeconds = route['duration'] as num;

          if (mounted) {
            setState(() {
              _routePoints = points;
              _routeDistance = distanceMeters >= 1000
                  ? '${(distanceMeters / 1000).toStringAsFixed(1)} km'
                  : '${distanceMeters.round()} m';
              // _routeDuration = '${(durationSeconds / 60).round()} min';
              // _isLoadingRoute = false;
            });

            // Fit bounds
            if (points.isNotEmpty) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) {
                  try {
                    final bounds = LatLngBounds.fromPoints(points);
                    _mapController.fitCamera(
                      CameraFit.bounds(
                        bounds: bounds,
                        padding: const EdgeInsets.all(20),
                      ),
                    );
                  } catch (_) {}
                }
              });
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading route in modal: $e');
      // if (mounted) setState(() => _isLoadingRoute = false);
    }
  }

  Future<void> _loadMedia() async {
    final data = _serviceData!;
    try {
      // Photos
      if (data['photos'] != null && (data['photos'] as List).isNotEmpty) {
        final keys = List<String>.from(data['photos']);
        final urls = <String>[];
        for (final key in keys) {
          try {
            final url = await _api.getMediaViewUrl(key);
            urls.add(url);
          } catch (_) {}
        }
        if (mounted) setState(() => _photoUrls = urls);
      }

      // Video
      if (data['video'] != null && data['video'].toString().isNotEmpty) {
        try {
          final videoKey = data['video'].toString();
          final videoUrl = await _api.getMediaViewUrl(videoKey);
          final controller = VideoPlayerController.networkUrl(
            Uri.parse(videoUrl),
          );
          await controller.initialize();
          if (mounted) setState(() => _videoController = controller);
        } catch (_) {}
      }

      // Audio
      if (data['audios'] != null && (data['audios'] as List).isNotEmpty) {
        if (mounted) {
          setState(() => _audioKeys = List<String>.from(data['audios']));
        }
      } else if (data['audio'] != null && data['audio'].toString().isNotEmpty) {
        if (mounted) setState(() => _audioKeys = [data['audio'].toString()]);
      }
    } catch (_) {}
  }

  Future<void> _toggleAudioPlay(String key) async {
    if (_loadingAudioKey != null) return;

    try {
      if (_playingAudioKey == key) {
        if (_isAudioPlaying) {
          await _audioPlayer.pause();
          setState(() => _isAudioPlaying = false);
        } else {
          await _audioPlayer.resume();
          setState(() => _isAudioPlaying = true);
        }
        return;
      }

      await _audioPlayer.stop();
      setState(() {
        _isAudioPlaying = false;
        _playingAudioKey = null;
        _loadingAudioKey = key;
        _audioPosition = Duration.zero;
        _audioDuration = Duration.zero;
      });

      final bytes = await _api.getMediaBytes(key);
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/modal_audio_${key.hashCode}.m4a');

      if (!await file.exists()) {
        await file.writeAsBytes(bytes);
      }

      await _audioPlayer.play(DeviceFileSource(file.path));
      setState(() {
        _playingAudioKey = key;
        _isAudioPlaying = true;
        _loadingAudioKey = null;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingAudioKey = null;
          _playingAudioKey = null;
          _isAudioPlaying = false;
        });
      }
    }
  }

  Future<void> _acceptService() async {
    debugPrint(
      'ServiceOfferModal: _acceptService called for ${widget.serviceId}',
    );
    setState(() => _isLoadingAction = true);
    final serviceId = widget.serviceId;

    // if (serviceId == null) return;

    try {
      debugPrint('ServiceOfferModal: Calling API acceptService...');
      await _api.acceptService(serviceId);
      debugPrint('ServiceOfferModal: API acceptService success!');
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop(); // Close modal
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Serviço aceito com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onAccepted?.call();
      }
    } catch (e) {
      debugPrint('ServiceOfferModal: Error accepting service: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro ao aceitar: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoadingAction = false);
    }
  }

  Future<void> _rejectService() async {
    final serviceId = widget.serviceId;
    // if (serviceId == null) return;

    final confirm = await CustomAlert.show(
      context: context,
      title: 'Recusar Serviço',
      content: 'Tem certeza que deseja recusar este serviço?',
      confirmText: 'Recusar',
      cancelText: 'Cancelar',
      isDestructive: true,
      icon: LucideIcons.xCircle,
    );

    if (confirm == true) {
      try {
        await _api.rejectService(serviceId);
        if (mounted) {
          Navigator.of(context, rootNavigator: true).pop();
          widget.onRejected?.call();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Erro ao recusar: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingDetails) {
      return Dialog(
        child: Container(
          padding: const EdgeInsets.all(32),
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Carregando oferta...'),
            ],
          ),
        ),
      );
    }

    if (_serviceData == null) {
      return Dialog(
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Erro ao carregar oferta.'),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(),
                child: const Text('Fechar'),
              ),
            ],
          ),
        ),
      );
    }

    final s = _serviceData!;
    final lat = double.tryParse(s['latitude']?.toString() ?? '0') ?? 0;
    final lon = double.tryParse(s['longitude']?.toString() ?? '0') ?? 0;
    final hasMap = lat != 0 && lon != 0;

    return PopScope(
      canPop: false,
      child: Dialog(
        insetPadding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
            maxWidth: 400,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        LucideIcons.bellRing,
                        color: Colors.green,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Nova Oferta de Serviço',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Responda rápido!',
                            style: TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Map
                      if (hasMap)
                        Container(
                          height: 180,
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey[300]!),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: FlutterMap(
                              mapController: _mapController,
                              options: MapOptions(
                                initialCenter: LatLng(lat, lon),
                                initialZoom: 14,
                                interactionOptions: const InteractionOptions(
                                  flags: InteractiveFlag.none,
                                ),
                              ),
                              children: [
                                TileLayer(
                                  urlTemplate:
                                      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                ),
                                PolylineLayer(
                                  polylines: [
                                    if (_routePoints.isNotEmpty)
                                      Polyline(
                                        points: _routePoints,
                                        strokeWidth: 4.0,
                                        color: Colors.blue,
                                      ),
                                  ],
                                ),
                                MarkerLayer(
                                  markers: [
                                    Marker(
                                      point: LatLng(lat, lon),
                                      child: const Icon(
                                        Icons.location_on,
                                        color: Colors.red,
                                        size: 30,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),

                      // Title & Description
                      Text(
                        s['description'] ?? 'Sem descrição',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        s['category_name'] ?? 'Serviço',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 16),

                      // Stats Row
                      Row(
                        children: [
                          Expanded(
                            child: _buildStatItem(
                              LucideIcons.dollarSign,
                              'Valor',
                              'R\$ ${(double.tryParse(s['provider_amount']?.toString() ?? '0') ?? 0).toStringAsFixed(2)}',
                              Colors.green,
                              valueFontSize: 32,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildStatItem(
                              LucideIcons.mapPin,
                              'Distância',
                              _routeDistance,
                              Colors.blue,
                              valueFontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Address
                      Row(
                        children: [
                          const Icon(
                            LucideIcons.map,
                            size: 16,
                            color: Colors.grey,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              s['address'] ?? 'Endereço não informado',
                              style: const TextStyle(fontSize: 13),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Media
                      if (_photoUrls.isNotEmpty) ...[
                        const Text(
                          'Fotos:',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 80,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _photoUrls.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(width: 8),
                            itemBuilder: (_, i) => ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                imageUrl: _photoUrls[i],
                                width: 80,
                                height: 80,
                                fit: BoxFit.cover,
                                memCacheWidth: 200,
                                maxWidthDiskCache: 400,
                                placeholder: (context, url) => BaseSkeleton(width: 80, height: 80),
                                errorWidget: (context, url, error) => const Icon(Icons.error),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      if (_audioKeys.isNotEmpty) ...[
                        const Text(
                          'Áudio:',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        ..._audioKeys.asMap().entries.map(
                          (e) => _buildAudioPlayer(e.value, e.key),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ],
                  ),
                ),
              ),

              const Divider(height: 1),

              // Actions
              Padding(
                padding: const EdgeInsets.all(16),
                child: _isLoadingAction
                    ? const Center(child: CircularProgressIndicator())
                    : Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _rejectService,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red,
                                side: const BorderSide(color: Colors.red),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                              ),
                              child: const Text('RECUSAR'),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                debugPrint(
                                  'ServiceOfferModal: ACCEPT Button Pressed!',
                                );
                                _acceptService();
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.orange,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                              ),
                              child: const Text('ACEITAR'),
                            ),
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(
    IconData icon,
    String label,
    String value,
    Color color, {
    double valueFontSize = 16,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(label, style: TextStyle(color: color, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: valueFontSize,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAudioPlayer(String key, int index) {
    final isPlaying = _playingAudioKey == key && _isAudioPlaying;
    final isLoading = _loadingAudioKey == key;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              isLoading
                  ? Icons.hourglass_empty
                  : (isPlaying ? Icons.pause : Icons.play_arrow),
            ),
            onPressed: () => _toggleAudioPlay(key),
            constraints: const BoxConstraints(),
            padding: EdgeInsets.zero,
            color: Colors.black87,
          ),
          const SizedBox(width: 8),
          Text('Áudio ${index + 1}'),
          if (isPlaying) ...[
            const Spacer(),
            Text(
              '${_audioPosition.inSeconds}/${_audioDuration.inSeconds}s',
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ],
      ),
    );
  }
}
