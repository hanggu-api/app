import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';
import '../../services/api_service.dart';
import '../../widgets/skeleton_loader.dart';
import '../home/widgets/service_card.dart'; // For some shared UI components if needed
import 'package:intl/intl.dart';
import '../../widgets/sponsor_banner.dart';

class ProviderProfileScreen extends StatefulWidget {
  final int providerId;

  const ProviderProfileScreen({super.key, required this.providerId});

  @override
  State<ProviderProfileScreen> createState() => _ProviderProfileScreenState();
}

class _ProviderProfileScreenState extends State<ProviderProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _api = ApiService();
  Map<String, dynamic>? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final data = await _api.getProviderProfile(widget.providerId);
      setState(() {
        _profile = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar perfil: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_profile == null) {
      return const Scaffold(
        body: Center(child: Text('Perfil não encontrado')),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 300,
              pinned: true,
              backgroundColor: const Color(0xFF0F0F0F),
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (_profile!['avatar_url'] != null)
                      Image.network(
                        _profile!['avatar_url'],
                        fit: BoxFit.cover,
                      )
                    else
                      Container(color: Colors.grey[900]),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            const Color(0xFF0F0F0F).withOpacity(0.8),
                            const Color(0xFF0F0F0F),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 60,
                      left: 20,
                      right: 20,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _profile!['commercial_name'] ?? _profile!['full_name'],
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(LucideIcons.star,
                                  color: Colors.amber, size: 18),
                              const SizedBox(width: 4),
                              Text(
                                '${_profile!['rating_avg']?.toStringAsFixed(1) ?? 'N/A'}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                ' (${_profile!['rating_count'] ?? 0} avaliações)',
                                style: TextStyle(color: Colors.grey[400]),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverAppBarDelegate(
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  indicatorColor: const Color(0xFFFFD700),
                  labelColor: const Color(0xFFFFD700),
                  unselectedLabelColor: Colors.grey,
                  tabs: const [
                    Tab(text: 'Informações'),
                    Tab(text: 'Serviços'),
                    Tab(text: 'Avaliações'),
                    Tab(text: 'QR Code'),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildInfoTab(),
            _buildServicesTab(),
            _buildReviewsTab(),
            _buildQRTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTab() {
    final schedules = _profile!['schedules'] as List? ?? [];
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Sobre',
            style: TextStyle(
                color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Text(
            _profile!['bio'] ?? 'Nenhuma descrição fornecida.',
            style: TextStyle(color: Colors.grey[300], height: 1.5),
          ),
          
          if (ApiService.baseUrl.contains('4012')) ...[
              const SizedBox(height: 20),
              SponsorBanner(isProviderProfile: true),
              const SizedBox(height: 10),
          ],

          const SizedBox(height: 30),
          const Text(
            'Localização',
            style: TextStyle(
                color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(LucideIcons.mapPin, color: Color(0xFFFFD700), size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _profile!['address'] ?? 'Endereço não disponível',
                  style: TextStyle(color: Colors.grey[300]),
                ),
              ),
            ],
          ),
          const SizedBox(height: 30),
          const Text(
            'Horário de Funcionamento',
            style: TextStyle(
                color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          ...schedules.map((s) {
            final days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
            final day = days[s['day_of_week'] % 7];
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(day, style: TextStyle(color: Colors.grey[400])),
                  Text(
                    '${s['start_time'].substring(0, 5)} - ${s['end_time'].substring(0, 5)}',
                    style: const TextStyle(color: Colors.white),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildServicesTab() {
    final services = _profile!['services'] as List? ?? [];

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: services.length,
      itemBuilder: (context, index) {
        final service = services[index];
        final price = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$')
            .format(double.tryParse(service['price'].toString()) ?? 0);

        return Card(
          color: Colors.grey[900],
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.only(bottom: 15),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        service['name'],
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        service['description'] ?? 'Sem descrição',
                        style: TextStyle(color: Colors.grey[400], fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${service['duration']} min • $price',
                        style: const TextStyle(
                          color: Color(0xFFFFD700),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => _handleBooking(service),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFFD700),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Agendar'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildReviewsTab() {
    final reviews = _profile!['reviews'] as List? ?? [];

    if (reviews.isEmpty) {
      return const Center(
        child: Text('Nenhuma avaliação ainda.',
            style: TextStyle(color: Colors.grey)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: reviews.length,
      itemBuilder: (context, index) {
        final review = reviews[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundImage: review['reviewer_avatar'] != null
                        ? NetworkImage(review['reviewer_avatar'])
                        : null,
                    radius: 20,
                    child: review['reviewer_avatar'] == null
                        ? const Icon(LucideIcons.user)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          review['reviewer_name'] ?? 'Usuário',
                          style: const TextStyle(
                              color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                        Row(
                          children: List.generate(
                            5,
                            (i) => Icon(
                              LucideIcons.star,
                              size: 14,
                              color: i < (review['rating'] ?? 0)
                                  ? Colors.amber
                                  : Colors.grey[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    DateFormat('dd/MM/yyyy')
                        .format(DateTime.parse(review['created_at'])),
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 52),
                child: Text(
                  review['comment'] ?? '',
                  style: TextStyle(color: Colors.grey[300]),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildQRTab() {
    final String deepLink = 'service101://profile/${widget.providerId}';

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: QrImageView(
              data: deepLink,
              version: QrVersions.auto,
              size: 200.0,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Mostre este QR Code para clientes',
            style: TextStyle(color: Colors.white, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'Eles poderão ver seus serviços e agendar diretamente.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  void _handleBooking(Map<String, dynamic> service) {
    context.push('/create-service', extra: {
      'providerId': widget.providerId,
      'service': service,
    });
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  _SliverAppBarDelegate(this._tabBar);

  final TabBar _tabBar;

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: const Color(0xFF0F0F0F),
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
