import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/media_service.dart';
import '../../services/notification_service.dart';
import '../../services/realtime_service.dart';
import '../client/widgets/provider_arrived_modal.dart';
import 'widgets/service_card.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../widgets/skeleton_loader.dart';
import '../profile/provider_profile_screen.dart';
import '../../widgets/banner_carousel.dart';
import '../../widgets/sponsor_banner.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  final _media = MediaService();
  List<dynamic> _services = [];
  bool _isLoading = true;
  String _userName = 'Cliente';
  Uint8List? _avatarBytes;
  Map<String, String> _lastStatuses = {};

  final List<Map<String, dynamic>> _notifications = [];
  late AnimationController _bellController;
  bool _isNotificationsOpen = false;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _bellController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _checkLocationPermission();
    _loadProfile();
    _loadServices();
    _loadAvatar();
    final rt = RealtimeService();
    rt.connect();
    rt.onEvent('service.created', (_) => _loadServices());
    rt.onEvent('service.status', (data) async {
      // Filter out test1 status updates if possible
      if (data['provider_name']?.toString().toLowerCase().contains('test1') ==
          true) {
        return;
      }

      try {
        final status = (data['status'] != null)
            ? data['status'].toString()
            : null;
        if (!kIsWeb && status != null) {
          final payload = data;
          await NotificationService().showFromService(payload, event: status);
        }

        // Add to local notification list
        if (mounted) {
          setState(() {
            _unreadCount++;
            _bellController.forward(from: 0.0);
            _notifications.insert(0, {
              'title': 'Atualização de Serviço',
              'body': 'Novo status: $status',
              'time': DateTime.now(),
              'isRead': false,
            });
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Atualização de Serviço: Novo status $status'),
              behavior: SnackBarBehavior.floating,
              action: SnackBarAction(
                label: 'Ver',
                onPressed: () => _handleServiceRedirection(
                  data['id']?.toString() ?? data['service_id']?.toString() ?? '',
                  data,
                ),
              ),
            ),
          );
        }
      } catch (_) {}
      _loadServices();
    });

    // Listen specifically for provider_arrived event to show payment modal immediately
    rt.onEvent('provider_arrived', (data) {
      if (!mounted) return;
      final serviceId = data['service_id'] ?? data['id'];
      if (serviceId != null) {
        showDialog(
          context: context,
          builder: (context) => ProviderArrivedModal(
            serviceId: serviceId.toString(),
            initialData: data,
          ),
        );
      }
      _loadServices();
    });

    // Listen for generic notifications (simulated or real)
    rt.onEvent('notification', (data) {
      // Filter out test1 notifications
      final title = (data['title'] ?? '').toString().toLowerCase();
      final body = (data['body'] ?? '').toString().toLowerCase();
      if (title.contains('test1') || body.contains('test1')) return;

      if (mounted) {
        // Add to local list
        setState(() {
          _unreadCount++;
          _bellController.forward(from: 0.0);
          _notifications.insert(0, {
            'title': data['title'] ?? 'Notificação',
            'body': data['body'] ?? '',
            'time': DateTime.now(),
            'isRead': false,
            'id': data['id'], // Service ID
            'type': data['type'],
          });
        });

        // Show Local Notification (System Banner)
        NotificationService().showNotification(
          data['title'] ?? 'Notificação',
          data['body'] ?? '',
        );

        // Also show SnackBar for in-app feedback
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '${data['title'] ?? 'Notificação'}: ${data['body'] ?? ''}',
            ),
            behavior: SnackBarBehavior.floating,
            action: SnackBarAction(
              label: 'Ver',
              onPressed: () => _handleServiceRedirection(
                data['id']?.toString() ?? '',
                data,
              ),
            ),
          ),
        );
      }
    });

    // Listen for chat messages
    void handleChatMessage(dynamic data) {
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

    rt.onEvent('chat.message', handleChatMessage);
    rt.onEvent('chat_message', handleChatMessage);

    // Listen for general service updates to refresh the list
    rt.onEvent('service.status', (_) => _loadServices());
    rt.onEvent('service.accepted', (_) => _loadServices());
    rt.onEvent('service.updated', (_) => _loadServices());
  }

  @override
  void dispose() {
    _bellController.dispose();
    super.dispose();
  }

  Future<void> _handleServiceRedirection(String serviceId, [Map<String, dynamic>? data]) async {
    if (serviceId.isEmpty) {
      context.push('/notifications');
      return;
    }

    // Se já tivermos a info no payload, usamos.
    String? locationType = data?['location_type']?.toString();
    
    // Se não tivermos (ex: evento simplificado), buscamos do backend
    if (locationType == null) {
      try {
        final details = await _api.getServiceDetails(serviceId);
        locationType = details['location_type']?.toString();
      } catch (e) {
        debugPrint('Error fetching service details for redirection: $e');
      }
    }

    if (!mounted) return;

    if (locationType == 'provider') {
      context.push('/scheduled-service/$serviceId');
    } else {
      context.push('/tracking/$serviceId');
    }
  }

  Future<void> _checkLocationPermission() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        // Option: Show snackbar or dialog to ask user to enable it
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Por favor, habilite a localização.')),
          );
        }
        // return; // or continue to request permission anyway
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
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
          ),
        );
        if (mounted) {
          // Just to ensure location is fetched
          debugPrint('Location fetched: $pos');
        }
      }
    } catch (_) {}
  }

  Future<void> _loadProfile() async {
    try {
      final res = await _api.getProfile();
      if (res['success'] == true && res['user'] != null) {
        if (mounted) {
          setState(() {
            _userName = res['user']['full_name'] ?? 'Cliente';
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _loadAvatar() async {
    try {
      final bytes = await _media.loadMyAvatarBytes();
      if (bytes != null && mounted) setState(() => _avatarBytes = bytes);
    } catch (_) {}
  }

  Future<void> _editAvatar() async {
    if (kIsWeb) {
      final res = await _media.pickImageWeb();
      if (res != null &&
          res.files.isNotEmpty &&
          res.files.first.bytes != null) {
        final file = res.files.first;
        final mime = file.extension != null
            ? 'image/${file.extension}'
            : 'image/jpeg';
        await _media.uploadAvatarBytes(file.bytes!, file.name, mime);
        await _loadAvatar();
      }
      return;
    }

    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera),
              title: const Text('Usar câmera'),
              onTap: () => Navigator.pop(ctx, 'camera'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Escolher da galeria'),
              onTap: () => Navigator.pop(ctx, 'gallery'),
            ),
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Escolher avatar rápido'),
              onTap: () => Navigator.pop(ctx, 'preset'),
            ),
          ],
        ),
      ),
    );
    if (choice == null) return;

    if (choice == 'preset') {
      await _choosePresetAvatar();
      return;
    }

    final source = choice == 'camera'
        ? ImageSource.camera
        : ImageSource.gallery;
    final xfile = await _media.pickImageMobile(source);
    if (xfile != null) {
      final bytes = await xfile.readAsBytes();
      await _media.uploadAvatarBytes(bytes, xfile.name, 'image/jpeg');
      await _loadAvatar();
    }
  }

  Future<void> _choosePresetAvatar() async {
    // Lista simples de avatares públicos. Pode trocar pelos seus próprios assets/URLs.
    final presets = List.generate(
      8,
      (i) => 'https://i.pravatar.cc/300?img=${i + 1}',
    );
    final picked = await showDialog<String?>(
      context: context,
      builder: (ctx) => Dialog(
        child: SizedBox(
          width: 320,
          height: 420,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: const Text(
                  'Escolha um avatar rápido',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                child: GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                  ),
                  itemCount: presets.length,
                  itemBuilder: (context, idx) {
                    final url = presets[idx];
                    return InkWell(
                      onTap: () => Navigator.of(ctx).pop(url),
                      child: ClipOval(
                        child: CachedNetworkImage(
                          imageUrl: url,
                          fit: BoxFit.cover,
                          memCacheWidth: 200, // Avatars are small
                          maxWidthDiskCache: 400,
                          placeholder: (context, url) => BaseSkeleton(width: 80, height: 80, borderRadius: BorderRadius.all(Radius.circular(40))),
                          errorWidget: (context, url, error) => const Icon(Icons.error),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (picked == null) return;
    try {
      final resp = await http.get(Uri.parse(picked));
      if (resp.statusCode == 200) {
        await _media.uploadAvatarBytes(
          resp.bodyBytes,
          'preset.png',
          'image/png',
        );
        await _loadAvatar();
      }
    } catch (_) {}
  }

  Future<void> _handleCancelService(String serviceId) async {
    try {
      await ApiService().cancelService(serviceId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Serviço cancelado com sucesso')),
        );
        _loadServices();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro ao cancelar serviço: $e')));
      }
    }
  }

  Future<void> _loadServices() async {
    try {
      final services = await _api.getMyServices();
      final prev = Map<String, String>.from(_lastStatuses);
      if (mounted) {
        setState(() {
          _services = services.where((s) {
            final st = s['status']?.toString().toLowerCase();
            return st != 'cancelled' && st != 'canceled';
          }).toList();
          _isLoading = false;
          _lastStatuses = {
            for (final s in services)
              (s['id']?.toString() ?? '${services.indexOf(s)}'):
                  (s['status']?.toString() ?? 'pending'),
          };
        });
        for (final s in services) {
          final id = s['id']?.toString();
          final newStatus = s['status']?.toString();
          final oldStatus = id != null ? prev[id] : null;

          // Only notify if we knew about this service before (not first load)
          // and the status actually changed to accepted
          if (oldStatus != null &&
              oldStatus != newStatus &&
              newStatus == 'accepted') {
            if (kIsWeb) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Seu pedido foi aceito')),
              );
            } else {
              await NotificationService().showAccepted();
            }
            break;
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        // Silently fail or show snackbar in real app
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadServices,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.only(bottom: 80),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_isNotificationsOpen) _buildNotificationAccordion(),
                    
                    if (ApiService.baseUrl.contains('4012')) SponsorBanner(), // Only in Demo Mode

                    if (ApiService.isDemoMode) const BannerCarousel(),

                    const SizedBox(height: 16),

                    // CTA Principal
                    Center(
                      child: Container(
                        height: 56,
                        width: 200,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.secondary,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 15,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              context.push('/create-service');
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.plus, color: Colors.white),
                                SizedBox(width: 8),
                                Text(
                                  'Pedir serviço',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 40),

                    // Meus Serviços (Real API)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Meus servirços',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          TextButton(
                            onPressed: () => context.push('/my-services'),
                            child: const Text('Ver todos'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    _isLoading
                        ? Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: Column(
                              children: List.generate(
                                3,
                                (index) => const Padding(
                                  padding: EdgeInsets.only(bottom: 16),
                                  child: CardSkeleton(),
                                ),
                              ),
                            ),
                          )
                        : _services.isEmpty
                            ? Center(
                                child: Text(
                                  'Nenhum serviço disponível no momento',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: AppTheme.darkBlueText,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              )
                            : ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                padding: const EdgeInsets.symmetric(horizontal: 24),
                                itemCount: _services.length,
                                separatorBuilder: (context, index) =>
                                    const SizedBox(height: 16),
                                itemBuilder: (context, index) {
                                  final service = _services[index];
                                  return ServiceCard(
                                    status: service['status'] ?? 'pending',
                                    providerName:
                                        service['provider_name'] ?? 'Aguardando...',
                                    distance: '---',
                                    category: service['profession'] ??
                                        service['category_name'] ??
                                        service['description'] ??
                                        'Serviço',
                                    details: service,
                                    onTrack: () {
                                      final id = service['id']?.toString();
                                      if (id != null) {
                                        context.push('/tracking/$id');
                                      }
                                    },
                                    onCancel: () {
                                      final id = service['id']?.toString();
                                      if (id != null) _handleCancelService(id);
                                    },
                                    onPay: () {
                                      final id = service['id']?.toString();
                                      if (id == null) return;
                                      
                                      final arrivedAt = service['arrived_at'];
                                      final type = arrivedAt != null ? 'remaining' : 'deposit';
                                      
                                      final priceTotal = double.tryParse(service['price_estimated']?.toString() ?? '0') ?? 0.0;
                                      final priceUpfront = double.tryParse(service['price_upfront']?.toString() ?? '0') ?? 0.0;
                                      final amount = type == 'remaining' ? (priceTotal - priceUpfront) : priceUpfront;

                                       context.push('/payment/$id', extra: {
                                         'serviceId': id,
                                         'type': type,
                                         'amount': amount,
                                         'total': priceTotal,
                                         'serviceType': service['service_type'],
                                         'professionName': service['profession'] ?? service['category_name'],
                                       });
                                    },
                                    onRate: () {
                                      final id = service['id']?.toString();
                                      if (id != null) {
                                        context.push('/review/$id');
                                      }
                                    },
                                  );
                                },
                              ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.primaryYellow,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 24,
        left: 24,
        right: 24,
        bottom: 32,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              InkWell(
                onTap: _editAvatar,
                borderRadius: BorderRadius.circular(40),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                    shape: BoxShape.circle,
                  ),
                  child: ClipOval(
                    child: _avatarBytes == null
                        ? const Center(
                            child: Icon(
                              LucideIcons.user,
                              color: Colors.grey,
                              size: 20,
                            ),
                          )
                        : Image.memory(
                            _avatarBytes!,
                            fit: BoxFit.cover,
                            width: 40,
                            height: 40,
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Bem-vindo(a),',
                    style: TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                  Text(
                    _userName,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Row(
            children: [
              GestureDetector(
                onTap: _showScanner,
                child: const Icon(
                  LucideIcons.qrCode,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(width: 16),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _isNotificationsOpen = !_isNotificationsOpen;
                    if (_isNotificationsOpen) {
                      _bellController.stop();
                      _unreadCount = 0;
                    }
                  });
                },
                child: Stack(
                  alignment: Alignment.topRight,
                  clipBehavior: Clip.none,
                  children: [
                    AnimatedBuilder(
                      animation: _bellController,
                      builder: (context, child) {
                        return Transform.rotate(
                          angle: sin(_bellController.value * pi * 4) * 0.2,
                          child: child,
                        );
                      },
                      child: const Icon(
                        LucideIcons.bell,
                        color: Colors.black87,
                      ),
                    ),
                    if (_unreadCount > 0)
                      Positioned(
                        top: -4,
                        right: -4,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            _unreadCount.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '101 Service',
                style: TextStyle(
                  color: AppTheme.darkBlueText,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showScanner() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: Color(0xFF0F0F0F),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[700],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Escaneie o QR Code',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Aponte para o código do profissional',
              style: TextStyle(color: Colors.grey[400]),
            ),
            const SizedBox(height: 30),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: SizedBox(
                  width: 250,
                  height: 250,
                  child: MobileScanner(
                    controller: MobileScannerController(
                      detectionSpeed: DetectionSpeed.noDuplicates,
                    ),
                    onDetect: (capture) {
                      final List<Barcode> barcodes = capture.barcodes;
                      for (final barcode in barcodes) {
                        final String? code = barcode.rawValue;
                        if (code != null && code.startsWith('service101://profile/')) {
                          final idStr = code.replaceFirst('service101://profile/', '');
                          final id = int.tryParse(idStr);
                          if (id != null) {
                            Navigator.pop(context);
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ProviderProfileScreen(providerId: id),
                              ),
                            );
                            break;
                          }
                        }
                      }
                    },
                  ),
                ),
              ),
            ),
            const SizedBox(height: 40),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationAccordion() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      margin: const EdgeInsets.symmetric(horizontal: 24),
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
          const Text(
            'Notificações',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          if (_notifications.isEmpty)
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
              itemCount: _notifications.length,
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final n = _notifications[index];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.05),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      LucideIcons.bell,
                      size: 16,
                      color: Colors.black,
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
}
