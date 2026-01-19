import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../widgets/audio_media_widget.dart';
import '../../widgets/image_media_widget.dart';
import '../../widgets/video_media_widget.dart';

class ServiceRequestScreen extends StatefulWidget {
  final int? initialProviderId;
  final Map<String, dynamic>? initialService;

  const ServiceRequestScreen({
    super.key,
    this.initialProviderId,
    this.initialService,
  });

  @override
  State<ServiceRequestScreen> createState() => _ServiceRequestScreenState();
}

class _ServiceRequestScreenState extends State<ServiceRequestScreen> {
  int _currentStep = 1;
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  bool _isLoading = false;
  final _api = ApiService();
  final MapController _mapController = MapController();
  double? _latitude;
  double? _longitude;
  String? _address;
  bool _chooseOtherAddress = false;
  bool _locationPickedByUser = false;
  List<Map<String, dynamic>> _suggestions = [];
  Timer? _debounce;
  Timer? _geoDebounce;
  final double _priceEstimated = 150.00;
  final List<String> _imageKeys = [];
  String? _videoKey;
  final List<String> _audioKeys = [];

  int? _aiCategoryId;
  String? _aiCategoryName;
  String? _aiProfessionName;
  double? _aiConfidence;
  int? _aiTaskId;
  String? _aiTaskName;
  double? _aiTaskPrice;
  String? _aiSuggestionMessage;
  String? _aiServiceType;
  final ScrollController _descScrollController = ScrollController();
  final GlobalKey _providersKey = GlobalKey();
  final GlobalKey _scheduleKey = GlobalKey();
  int? _selectedProviderIndex;
  int? _selectedProviderId;
  bool _needsDetails = false;
  bool _aiClassifying = false;
  Timer? _aiDebounce;
  final TextEditingController _professionSearchController =
      TextEditingController();
  List<String> _allProfessions = [];
  List<String> _filteredProfessions = [];
  final Map<String, int> _professionCategoryMap = {};

  // Fallback manual de categorias caso a API não retorne
  static final Map<String, int> _fallbackCategories = {
    'Geral': 1,
    'Reformas': 2,
    'Assistência Técnica': 3,
    'Limpeza': 4,
    'Autos': 5,
    'Beleza': 6,
    'Moda': 7,
    'Aulas': 8,
    'Saúde': 9,
    'Festas': 10,
    // Profissões comuns
    'Pintor': 2,
    'Pedreiro': 2,
    'Eletricista': 3,
    'Encanador': 2,
    'Marceneiro': 2,
    'Serralheiro': 2,
    'Vidraceiro': 2,
    'Diarista': 4,
    'Mecânico': 5,
  };

  bool _showTeach = false;
  bool _hasAiRun = false;

  // --- NOVAS VARIÁVEIS DE ESTADO ---
  String? _selectedProfession;
  Map<String, dynamic>? _selectedService; // Para Barbeiro/Cabeleireiro
  DateTime? _selectedDate;
  String? _selectedTimeSlot;

  // Real Slots from API
  List<Map<String, dynamic>> _realSlots = [];
  bool _loadingSlots = false;

  // Providers from API
  List<Map<String, dynamic>> _providers = [];
  bool _loadingProviders = false;
  // Cache next available time for each provider: {providerId: "HH:MM"}
  final Map<int, String> _nextAvailableTimes = {};

  Future<void> _fetchProviders(String profession) async {
    if (_loadingProviders) return;
    setState(() => _loadingProviders = true);
    try {
      final providers = await _api.searchProviders(
        term: profession,
        lat: _latitude,
        lon: _longitude,
      );
      setState(() {
        _providers = providers;
      });

      // Fetch slots for each provider to show "Next available"
      // Optimization: Fetch only for the first 5 to avoid network congestion
      final limit = providers.length > 5 ? 5 : providers.length;
      for (int i = 0; i < limit; i++) {
        _fetchNextSlotForProvider(providers[i]['id']);
      }
    } catch (e) {
      debugPrint('Error fetching providers: $e');
    } finally {
      if (mounted) setState(() => _loadingProviders = false);
    }
  }

  Future<void> _fetchNextSlotForProvider(int providerId) async {
    try {
      final dateStr = DateTime.now().toString().split(' ')[0];
      final slots = await _api.getProviderSlots(providerId, date: dateStr);
      final freeSlots = slots.where((s) => s['status'] == 'free').toList();

      if (freeSlots.isNotEmpty) {
        final first = freeSlots.first;
        final startTime = DateTime.parse(first['start_time'] as String);
        final timeStr =
            "${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}";
        if (mounted) {
          setState(() {
            _nextAvailableTimes[providerId] = timeStr;
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching slots for provider $providerId: $e');
    }
  }

  Future<void> _fetchSlots() async {
    if (_loadingSlots) return;
    if (_selectedProviderId == null) return;

    setState(() => _loadingSlots = true);
    try {
      final date = _selectedDate ?? DateTime.now().toUtc().subtract(const Duration(hours: 3));
      // Use YYYY-MM-DD format manually to avoid timezone shifts from toString()
      final dateStr = "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
      
      final slots = await _api.getProviderSlots(
        _selectedProviderId!,
        date: dateStr,
      );

      setState(() {
        _realSlots = slots;
      });
    } catch (e) {
      debugPrint('Error fetching slots: $e');
    } finally {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  @override
  void initState() {
    super.initState();
    // 1. No Web, solicitar geolocalização apenas por gesto do usuário
    // Para mobile, pode iniciar automaticamente
    if (!kIsWeb) {
      _useMyLocation(initialLoad: true);
    }
    // Inicializa a data com a data atual (normalizada para início do dia)
    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);

    if (widget.initialProviderId != null) {
      _selectedProviderId = widget.initialProviderId;
      if (widget.initialService != null) {
        _selectedService = widget.initialService;
        _selectedProfession = widget.initialService!['category'] ?? widget.initialService!['name'];
        _aiProfessionName = _selectedProfession;
        _descriptionController.text = "Agendamento de ${_selectedService!['name']}";
      }
      // If we have a provider, we can probably skip straight to step 2 or at least focus on it
      _fetchSlots();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _geoDebounce?.cancel();
    _aiDebounce?.cancel();
    _descriptionController.dispose();
    _addressController.dispose();
    _professionSearchController.dispose();
    _descScrollController.dispose();
    // MapController do flutter_map não possui dispose() direto, 
    // mas é recomendável limpar referências se possível.
    
    super.dispose();
  }

  Future<void> _submitService() async {
    setState(() => _isLoading = true);
    debugPrint('DEBUG: _submitService called. _aiTaskId: $_aiTaskId, _aiTaskPrice: $_aiTaskPrice, Description: ${_descriptionController.text}');

    try {
      await _api.loadToken();

      // Garantir que temos um endereço e coordenadas válidas
      // Para prestador fixo (selectedProviderId != null), usamos o endereço do prestador se a localização do usuário não estiver definida
      if (_selectedProviderId != null) {
        if (_latitude == null || _longitude == null) {
          final provider = _providers.firstWhere(
            (p) => (p['id'] as num?)?.toInt() == _selectedProviderId,
            orElse: () => {},
          );
          if (provider.isNotEmpty) {
            _latitude = (provider['latitude'] as num?)?.toDouble();
            _longitude = (provider['longitude'] as num?)?.toDouble();
            _address = provider['address']?.toString();
            _addressController.text = _address ?? '';
          }
        }
      }

      if (_latitude == null ||
          _longitude == null ||
          (_addressController.text.isEmpty && _address == null)) {
        throw Exception("Localização ou endereço não definidos.");
      }

      final addrRaw = _addressController.text.isEmpty
          ? (_address ?? '')
          : _addressController.text;
      final addressSafe = addrRaw.length > 255
          ? addrRaw.substring(0, 255)
          : addrRaw;

      String desc = _descriptionController.text.isEmpty
          ? ''
          : _descriptionController.text;
      if (desc.trim().length < 5) {
        desc = '${desc.trim()} - Serviço solicitado';
      }

      // Se a IA encontrou uma tarefa específica, adiciona na descrição
      if (_aiTaskName != null) {
        desc = "Serviço: $_aiTaskName\n$desc";
      }

      // Definir categoria
      int categoryId = _aiCategoryId ?? 1; // 1 = Geral (Fallback)

      // Definir preço
      double price = _aiTaskPrice ?? _priceEstimated;
      double upfront = price * 0.30;

      // Calcular scheduled_at se houver data e hora selecionadas
      DateTime? scheduledAt;
      if (_selectedDate != null && _selectedTimeSlot != null) {
        try {
          final parts = _selectedTimeSlot!.split(':');
          if (parts.length == 2) {
            final hour = int.parse(parts[0]);
            final minute = int.parse(parts[1]);
            scheduledAt = DateTime(
              _selectedDate!.year,
              _selectedDate!.month,
              _selectedDate!.day,
              hour,
              minute,
            );
          }
        } catch (e) {
          debugPrint('Erro ao calcular scheduledAt: $e');
        }
      }

      final result = await _api.createService(
        categoryId: categoryId,
        description: desc,
        latitude: _latitude!,
        longitude: _longitude!,
        address: addressSafe,
        priceEstimated: price,
        priceUpfront: upfront,
        imageKeys: _imageKeys,
        videoKey: _videoKey,
        audioKeys: _audioKeys,
        profession: _selectedProfession ?? _aiProfessionName,
        locationType:
            (_selectedProviderId != null || _aiServiceType == 'at_provider')
            ? 'provider'
            : 'client',
        providerId: _selectedProviderId,
        scheduledAt: scheduledAt,
        taskId: _aiTaskId,
      );

      _handleSuccess(result, upfront, price);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _handleSuccess(
    Map<String, dynamic> result,
    double upfrontAmount,
    double totalAmount,
  ) {
    if (!mounted) return;
    final serviceId =
        result['service']?['id']?.toString() ?? result['id']?.toString();

    if (serviceId == null) {
      throw Exception("Não foi possível obter o ID do serviço criado.");
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Serviço criado! Iniciando pagamento...'),
        backgroundColor: Colors.green,
      ),
    );
    context.go(
      '/payment/$serviceId',
      extra: {
        'serviceId': serviceId,
        'amount': upfrontAmount,
        'total': totalAmount,
        'type': 'deposit',
      },
    );
  }

  void _tryAutoAdvanceFromStep1AfterLocationPick() {
    if (_currentStep != 1) return;
    if (_aiServiceType == 'at_provider') return;
    if (!_locationPickedByUser) return;
    if (_latitude == null || _longitude == null) return;
    if (_descriptionController.text.trim().isEmpty) return;
    if (_aiProfessionName == null && _selectedProfession == null) return;
    _locationPickedByUser = false;
    _nextStep();
  }

  void _nextStep() async {
    // Step 1: Description + AI
    if (_currentStep == 1) {
      if (_descriptionController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Por favor, descreva o problema.')),
        );
        return;
      }

      // If AI hasn't found anything and user hasn't selected manually
      if (_aiProfessionName == null && _selectedProfession == null) {
        if (_aiClassifying) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Aguarde a IA identificar o profissional...'),
            ),
          );
          return;
        }

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Por favor, descreva melhor ou selecione uma profissão.',
            ),
          ),
        );
        return;
      }

      // Sync AI selection to main state if available
      if (_aiProfessionName != null) {
        setState(() {
          _selectedProfession = _aiProfessionName;
        });
      }

      setState(() {
        _currentStep++;
        if (_selectedProviderId != null) {
          _fetchSlots();
        }
      });
      return;
    }

    // Step 2: Location OR Schedule
    if (_currentStep == 2) {
      // Se for Agendamento (Prestador Fixo)
      if (_selectedProviderId != null) {
        if (_selectedDate == null || _selectedTimeSlot == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Por favor, escolha data e horário.')),
          );
          return;
        }
        setState(() => _currentStep++);
        return;
      }

      // Se for Localização (Cliente Móvel)
      if (_latitude == null || _longitude == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Por favor, defina a localização no mapa.'),
          ),
        );
        return;
      }
      setState(() => _currentStep++);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollToSchedule();
      });
      return;
    }

    // Step 3: Submit
    if (_currentStep == 3) {
      _submitService();
    }
  }

  void _prevStep() {
    if (_currentStep > 1) {
      setState(() {
        _currentStep--;
      });
    } else {
      context.pop();
    }
  }

  // --- MÉTODOS DE LOCALIZAÇÃO ---

  Future<void> _useMyLocation({bool initialLoad = false}) async {
    bool serviceEnabled;
    LocationPermission permission;

    // 1. Check if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Serviço de localização desativado. Por favor, ative o GPS.',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      if (!kIsWeb) {
        await Geolocator.openLocationSettings();
      }
      return;
    }

    // 2. Check permissions
    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Permissão de localização negada.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Permissão de localização permanentemente negada. Habilite nas configurações.',
          ),
          backgroundColor: Colors.red,
        ),
      );
      if (!kIsWeb) {
        await Geolocator.openAppSettings();
      }
      return;
    }

    // 3. Get Position
    try {
      if (!initialLoad && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Buscando sua localização precisa...'),
            duration: Duration(seconds: 2),
          ),
        );
        setState(() {
          _addressController.text = "Aguardando GPS...";
        });
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.best,
          timeLimit: Duration(seconds: 20),
        ),
      );

      setState(() {
        _latitude = pos.latitude;
        _longitude = pos.longitude;
        _chooseOtherAddress = false;
      });

      try {
        _mapController.move(LatLng(pos.latitude, pos.longitude), 18);
      } catch (_) {}

      await _reverseGeocode(pos.latitude, pos.longitude);
      if (!initialLoad) {
        _tryAutoAdvanceFromStep1AfterLocationPick();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao obter localização: $e'),
          backgroundColor: Colors.red,
        ),
      );
      // Fallback to default only if we don't have a location yet
      if (_latitude == null) {
        setState(() {
          _latitude = -23.550520;
          _longitude = -46.633308;
          _address = 'Localização Padrão (Erro)';
          _addressController.text = _address!;
        });
        _mapController.move(const LatLng(-23.550520, -46.633308), 13);
      }
    }
  }

  Future<void> _reverseGeocode(double lat, double lon) async {
    try {
      final api = ApiService();
      final result = await api.get(
        '/geo/reverse?lat=${lat.toStringAsFixed(6)}&lon=${lon.toStringAsFixed(6)}',
      );

      // Nova estrutura retornada pelo backend:
      // { success: true, address: "String formatada", details: { ... } }

      String finalAddress = '';

      if (result['address'] is String) {
        finalAddress = result['address'];
      } else if (result['address'] is Map) {
        // Fallback para estrutura antiga ou direta do Nominatim se mudarmos algo
        finalAddress = _formatAddressData(result['address']);
      }

      if (finalAddress.isEmpty && result['details'] is Map) {
        finalAddress = _formatAddressData(result['details']);
      }

      // Fallback antigo (display_name)
      if (finalAddress.isEmpty) {
        final display = (result['display_name'] ?? '').toString();
        if (display.isNotEmpty) {
          final segs = display.split(',').map((s) => s.trim()).toList();
          finalAddress = segs.take(4).join(', ');
        }
      }

      if (finalAddress.length > 120) {
        finalAddress = finalAddress.substring(0, 120);
      }

      setState(() {
        _address = finalAddress.isNotEmpty
            ? finalAddress
            : 'Endereço não encontrado';
        _addressController.text = _address!;
      });
    } catch (_) {
      setState(() {
        _address = 'Endereço não encontrado';
        _addressController.text = _address!;
      });
    }
  }

  String _formatAddressData(Map<String, dynamic> addr) {
    final street =
        (addr['road'] ??
                addr['pedestrian'] ??
                addr['footway'] ??
                addr['residential'])
            ?.toString();
    final house = addr['house_number']?.toString();
    final neigh =
        (addr['suburb'] ??
                addr['neighbourhood'] ??
                addr['quarter'] ??
                addr['city_district'])
            ?.toString();
    final city =
        (addr['city'] ??
                addr['town'] ??
                addr['village'] ??
                addr['municipality'])
            ?.toString();
    final state = (addr['state_code'] ?? addr['state'])?.toString();

    final p1 = [
      street,
      house,
    ].where((e) => e != null && e.isNotEmpty).join(', ');
    final p2 = [neigh].where((e) => e != null && e.isNotEmpty).join('');
    final p3 = [
      city,
      state,
    ].where((e) => e != null && e.isNotEmpty).join(' - ');

    return [p1, p2, p3].where((e) => e.isNotEmpty).join(' - ');
  }

  Future<void> _searchAddress(String q) async {
    if (q.trim().length < 3) {
      setState(() => _suggestions = []);
      return;
    }
    try {
      final api = ApiService();
      final result = await api.get(
        '/geo/search?q=${Uri.encodeQueryComponent(q)}',
      );
      final list = (result['results'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      setState(() {
        _suggestions = list;
      });
    } catch (_) {
      setState(() => _suggestions = []);
    }
  }

  Widget _buildContent() {
    switch (_currentStep) {
      case 1:
        return _buildDescriptionStep();
      case 2:
        if (_selectedProviderId != null) {
          return _buildScheduleStep();
        }
        return _buildLocationStep();
      case 3:
        return _buildReviewStep();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildScheduleStep() {
    final provider = _providers.firstWhere(
      (p) => (p['id'] as num?)?.toInt() == _selectedProviderId,
      orElse: () => {},
    );
    final providerName =
        (provider['commercial_name'] ?? provider['full_name'] ?? 'Profissional')
            .toString();
    final serviceName =
        (_aiTaskName ??
                _selectedService?['name'] ??
                _selectedProfession ??
                _aiProfessionName)
            ?.toString()
            .trim();

    final double price = _aiTaskPrice ?? _priceEstimated;

    return SingleChildScrollView(
      key: const PageStorageKey('schedule_step'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Agendamento',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Escolha data e horário para o serviço',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Theme.of(
                        context,
                      ).primaryColor.withValues(alpha: 0.1),
                      child: Icon(
                        LucideIcons.user,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PROFISSIONAL SELECIONADO',
                            style: TextStyle(fontSize: 10, color: Colors.grey),
                          ),
                          Text(
                            providerName,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Valor do Serviço',
                        style: TextStyle(color: Colors.grey),
                      ),
                      Text(
                        'R\$ ${price.toStringAsFixed(2).replaceAll('.', ',')}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                  if (serviceName != null && serviceName.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: Text(
                        serviceName,
                        textAlign: TextAlign.left,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),

          const SizedBox(height: 24),

          Container(
            key: _scheduleKey,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Theme(
              data: Theme.of(context).copyWith(
                colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: Colors.black,
                  onPrimary: Colors.white,
                ),
              ),
              child: CalendarDatePicker(
                initialDate: _selectedDate ?? DateTime.now(),
                firstDate: () {
                  final now = DateTime.now();
                  return DateTime(now.year, now.month, now.day);
                }(),
                lastDate: () {
                  final now = DateTime.now();
                  return DateTime(now.year, now.month, now.day).add(const Duration(days: 60));
                }(),
                onDateChanged: (date) {
                  setState(() {
                    _selectedDate = date;
                    _selectedTimeSlot = null;
                  });
                  _fetchSlots();
                },
              ),
            ),
          ),

          const SizedBox(height: 24),

          const Text(
            'Horários Disponíveis',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),

          if (_loadingSlots)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_realSlots.where((s) => s['status'] == 'free').isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Nenhum horário disponível para esta data.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.orange),
              ),
            )
          else
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: _realSlots.where((s) => s['status'] == 'free').map((
                slot,
              ) {
                final String startStr = slot['start_time'].toString();
                final String timeStr = startStr.contains('T')
                    ? startStr.split('T')[1].substring(0, 5)
                    : "${DateTime.parse(startStr).hour.toString().padLeft(2, '0')}:${DateTime.parse(startStr).minute.toString().padLeft(2, '0')}";
                final isSelected = _selectedTimeSlot == timeStr;
                return ChoiceChip(
                  label: Text(timeStr),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(
                      () => _selectedTimeSlot = selected ? timeStr : null,
                    );
                  },
                  selectedColor: Theme.of(context).primaryColor,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : Colors.black87,
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                  backgroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: isSelected
                          ? Theme.of(context).primaryColor
                          : Colors.grey.shade300,
                    ),
                  ),
                );
              }).toList(),
            ),

          const SizedBox(height: 32),

          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: (_selectedDate != null && _selectedTimeSlot != null)
                  ? _nextStep
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF6C00),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: const Text(
                'Confirmar Agendamento',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(height: 48),
        ],
      ),
    );
  }

  Widget _buildDescriptionStep() {
    return SingleChildScrollView(
      controller: _descScrollController,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Busque servirços e soluções',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const Text(
            'Quanto mais detalhes, melhor',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),

          TextField(
            controller: _descriptionController,
            minLines: 4,
            maxLines: 4,
            onChanged: _onDescriptionChanged,
            decoration: InputDecoration(
              hintText: 'Ex: Chuveiro da suíte não esquenta...',
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Indicador de qualidade da descrição
          Builder(
            builder: (context) {
              final len = _descriptionController.text.trim().length;
              Color color;
              double progress;

              // Normaliza o progresso até 50 caracteres
              progress = (len / 50.0).clamp(0.0, 1.0);

              if (len < 6) {
                color = Colors.red;
                // Garante que apareça pelo menos um pouquinho se tiver texto
                if (len > 0) progress = 0.1;
              } else if (len < 20) {
                color = Colors.amber;
              } else {
                color = Colors.green;
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Colors.grey[200],
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    len < 6
                        ? 'Descreva mais detalhes...'
                        : (len < 20 ? 'Bom começo, continue...' : 'Excelente!'),
                    style: TextStyle(
                      color: color,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      // Removido style duplicado que causaria erro
                    ),
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: 16),
          // _buildLocationSelector removed from Step 1 per user request
          // It will be handled in Step 2 for mobile providers.

          // --- Media fields are at the bottom ---
          const SizedBox(height: 24),
          if (_aiClassifying)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: LinearProgressIndicator(),
            ),

          if (_aiCategoryName != null || _aiProfessionName != null)
            Container(
              margin: const EdgeInsets.symmetric(vertical: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 6)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        LucideIcons.badgeCheck,
                        color: Theme.of(context).primaryColor,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Sugestão da IA',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_aiCategoryName != null)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Categoria',
                          style: TextStyle(color: Colors.grey),
                        ),
                        Text(
                          _aiCategoryName!,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  if (_aiProfessionName != null)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Profissão',
                          style: TextStyle(color: Colors.grey),
                        ),
                        Text(
                          _aiProfessionName!,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  if (_aiConfidence != null)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Confiança',
                          style: TextStyle(color: Colors.grey),
                        ),
                        Text(
                          '${(_aiConfidence! * 100).toStringAsFixed(0)}%',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  if (_aiTaskName != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Serviço',
                            style: TextStyle(color: Colors.grey),
                          ),
                          Flexible(
                            child: Text(
                              '${_aiTaskName!} - R\$ ${_aiTaskPrice?.toStringAsFixed(2) ?? '?'}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_aiSuggestionMessage != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _aiTaskId != null
                              ? Colors.green.withValues(alpha: 0.1)
                              : Colors.orange.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _aiTaskId != null
                                ? Colors.green
                                : Colors.orange,
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  _aiTaskId != null
                                      ? LucideIcons.checkCircle
                                      : LucideIcons.alertCircle,
                                  color: _aiTaskId != null
                                      ? Colors.green
                                      : Colors.orange,
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _aiTaskId != null
                                        ? "Serviço Identificado"
                                        : "Preciso de mais detalhes",
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: _aiTaskId != null
                                          ? Colors.green
                                          : Colors.orange,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _aiSuggestionMessage!,
                              style: const TextStyle(
                                color: Colors.black87,
                                fontSize: 13,
                              ),
                            ),
                            if (_needsDetails)
                              Padding(
                                padding: const EdgeInsets.only(top: 8.0),
                                child: Text(
                                  "Adicione informações como tamanho, quantidade ou modelo para calcular o valor exato.",
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.red[700],
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {
                        setState(() {
                          _showTeach = !_showTeach;
                        });
                        _ensureProfessionsLoaded();
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.black, // Cor do texto
                      ),
                      child: const Text('Corrigir sugestão'),
                    ),
                  ),
                ],
              ),
            ),

          if (_aiServiceType == 'at_provider' && _aiProfessionName != null)
            _buildFixedProvidersList(),

          // Removido _buildScheduleStep daqui, pois agora será o Step 2
          if ((_hasAiRun &&
                  _aiCategoryId == null &&
                  _aiProfessionName == null &&
                  !_aiClassifying) ||
              _showTeach)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                Text(
                  (_aiCategoryId == null && _aiProfessionName == null)
                      ? 'Não consegui identificar. Você pode detalhar mais ou escolher a profissão abaixo:'
                      : 'Não é isso? Pesquise e escolha a profissão correta:',
                  style: const TextStyle(color: Colors.orange),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _professionSearchController,
                  onChanged: _onProfessionSearchChanged,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(LucideIcons.search),
                    hintText:
                        'Pesquisar profissão (ex.: Encanador, Eletricista...)',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                if (_filteredProfessions.isNotEmpty)
                  Container(
                    constraints: const BoxConstraints(maxHeight: 160),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(color: Colors.black12, blurRadius: 6),
                      ],
                    ),
                    child: ListView(
                      shrinkWrap: true,
                      children: _buildGroupedProfessionItems(),
                    ),
                  ),
              ],
            ),

          const SizedBox(height: 12),

          // Mostra mídia apenas se a IA já rodou e não é prestador fixo
          if (_hasAiRun && _aiServiceType != 'at_provider') ...[
            ImageMediaWidget(
              imageCount: _imageKeys.length,
              onImagesSelected: _handleImagesSelected,
            ),

            const SizedBox(height: 12),

            if (_imageKeys.isNotEmpty)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _imageKeys
                    .map(
                      (k) => FutureBuilder<Uint8List>(
                        future: _api.getMediaBytes(k),
                        builder: (context, snapshot) {
                          final bytes = snapshot.data;
                          return Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Builder(
                                  builder: (context) {
                                    final fullWidth =
                                        MediaQuery.of(context).size.width - 32;
                                    final isSingle = _imageKeys.length == 1;
                                    final itemWidth = isSingle
                                        ? fullWidth
                                        : (fullWidth - 8) / 2;
                                    final itemHeight = itemWidth;
                                    return SizedBox(
                                      width: itemWidth,
                                      height: itemHeight,
                                      child: bytes != null
                                          ? Image.memory(
                                              bytes,
                                              fit: BoxFit.cover,
                                              width: itemWidth,
                                              height: itemHeight,
                                            )
                                          : const SizedBox(),
                                    );
                                  },
                                ),
                              ),
                              Positioned(
                                right: 0,
                                top: 0,
                                child: InkWell(
                                  onTap: () =>
                                      setState(() => _imageKeys.remove(k)),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: Colors.black54,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(
                                      LucideIcons.x,
                                      size: 16,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    )
                    .toList(),
              ),

            const SizedBox(height: 12),

            VideoMediaWidget(
              videoKey: _videoKey,
              onVideoRecorded: _handleVideoSelected,
              onVideoRemoved: () => setState(() => _videoKey = null),
            ),

            const SizedBox(height: 12),

            AudioMediaWidget(
              audioKeys: _audioKeys,
              onAudioRecorded: (file) {
                _handleAudioSelected(file);
              },
              onAudioRemoved: () {
                setState(() {
                  _audioKeys.clear();
                });
              },
            ),
          ],

          const SizedBox(height: 16),

          if (_aiServiceType != 'at_provider' || _aiProfessionName == null)
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed:
                    (!_aiClassifying &&
                        !_needsDetails &&
                        (_aiTaskPrice != null || _selectedProviderId != null))
                    ? _nextStep
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF6C00),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text('Continuar'),
              ),
            ),
        ],
      ),
    );
  }

  void _scrollToProviders() {
    final ctx = _providersKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
        alignment: 0.1,
      );
    }
  }

  void _scrollToSchedule() {
    final ctx = _scheduleKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
        alignment: 0.05,
      );
    }
  }

  Future<void> _handleAudioSelected(PlatformFile file) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      messenger.showSnackBar(
        const SnackBar(content: Text('Enviando áudio...')),
      );

      XFile xfile;
      if (file.bytes != null) {
        xfile = XFile.fromData(file.bytes!, name: file.name);
      } else if (file.path != null) {
        xfile = XFile(file.path!, name: file.name);
      } else {
        throw Exception("Áudio vazio ou inválido");
      }

      final bytes = await xfile.readAsBytes();

      String filename = file.name;
      if (filename.isEmpty || !filename.contains('.')) {
        filename = 'service_audio_${DateTime.now().millisecondsSinceEpoch}.m4a';
      }

      final key = await _api.uploadServiceAudio(bytes, filename: filename);

      setState(() => _audioKeys.add(key));

      messenger.showSnackBar(
        const SnackBar(
          content: Text('Áudio enviado!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      debugPrint('Erro audio: $e');
      messenger.showSnackBar(
        SnackBar(
          content: Text('Erro ao enviar áudio: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _handleVideoSelected(XFile video) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Processando vídeo... aguarde.'),
          duration: Duration(seconds: 2),
        ),
      );

      String key;
      final bytes = await video.readAsBytes();

      String? mime = video.mimeType;
      String ext = 'mp4';
      if (mime != null) {
        if (mime.contains('webm')) {
          ext = 'webm';
        } else if (mime.contains('quicktime') || mime.contains('mov')) {
          ext = 'mov';
        }
      }

      String filename = video.name;
      if (filename.isEmpty ||
          filename.toLowerCase().contains('blob') ||
          !filename.contains('.')) {
        filename =
            'service_video_${DateTime.now().millisecondsSinceEpoch}.$ext';
      }

      key = await _api.uploadServiceVideo(
        bytes,
        filename: filename,
        mimeType: mime,
      );

      setState(() {
        _videoKey = key;
      });

      messenger.showSnackBar(
        const SnackBar(
          content: Text('Vídeo adicionado com sucesso!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      debugPrint('Erro ao enviar vídeo: $e');
      messenger.showSnackBar(
        SnackBar(
          content: Text('Erro ao enviar vídeo: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _handleImagesSelected(List<XFile> imgs) async {
    if (_imageKeys.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Máximo de 3 fotos permitido.')),
      );
      return;
    }

    if (imgs.isNotEmpty) {
      for (final img in imgs.take(3 - _imageKeys.length)) {
        try {
          final bytes = await img.readAsBytes();

          String filename = img.name;
          if (filename.isEmpty ||
              filename.toLowerCase().contains('blob') ||
              !filename.contains('.')) {
            filename =
                'service_image_${DateTime.now().millisecondsSinceEpoch}.jpg';
          }

          final key = await _api.uploadServiceImage(
            bytes,
            filename: filename,
            mimeType: img.mimeType ?? 'image/jpeg',
          );
          setState(() => _imageKeys.add(key));
        } catch (e) {
          debugPrint('Erro ao enviar imagem: $e');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Erro ao enviar imagem: $e')),
            );
          }
        }
      }
    }
  }

  Widget _buildLocationStep() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Onde é o serviço?',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const Text(
            'Confirme ou ajuste a localização do serviço',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Icon(
                LucideIcons.mapPin,
                color: Theme.of(context).primaryColor,
                size: 16,
              ),
              const SizedBox(width: 6),
              const Text(
                'Endereço',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),

          TextField(
            controller: _addressController,
            readOnly: !_chooseOtherAddress,
            onChanged: (value) {
              if (_chooseOtherAddress) {
                _debounce?.cancel();
                _debounce = Timer(
                  const Duration(milliseconds: 400),
                  () => _searchAddress(value),
                );
              }
            },
            decoration: InputDecoration(
              prefixIcon: _chooseOtherAddress
                  ? const Icon(LucideIcons.search)
                  : Icon(
                      LucideIcons.mapPin,
                      color: Theme.of(context).primaryColor,
                    ),
              hintText: _chooseOtherAddress
                  ? 'Digite o endereço (rua, número, bairro...)'
                  : 'Endereço da localização atual',
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              suffixIcon: _chooseOtherAddress
                  ? IconButton(
                      icon: const Icon(LucideIcons.x),
                      onPressed: () {
                        setState(() {
                          _addressController.text = _address ?? '';
                          _chooseOtherAddress = false;
                          _suggestions = [];
                        });
                      },
                    )
                  : null,
            ),
          ),

          // Botão explícito para forçar localização (Solicitado pelo usuário)
          Padding(
            padding: const EdgeInsets.only(top: 8.0),
            child: InkWell(
              onTap: () => _useMyLocation(initialLoad: false),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.my_location,
                      color: Theme.of(context).primaryColor,
                      size: 18,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Usar minha localização atual',
                      style: TextStyle(
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Flexible(
                child: TextButton(
                  onPressed: () {
                    if (!_chooseOtherAddress) {
                      setState(() {
                        _chooseOtherAddress = true;
                        _addressController.clear();
                        _suggestions = [];
                      });
                    } else {
                      _useMyLocation();
                    }
                  },
                  child: Text(
                    _chooseOtherAddress
                        ? 'Cancelar busca manual'
                        : 'Escolher outro endereço manualmente',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.grey),
                  ),
                ),
              ),
            ],
          ),

          if (_chooseOtherAddress && _suggestions.isNotEmpty)
            Container(
              height: _suggestions.length > 3 ? 180 : null,
              constraints: const BoxConstraints(maxHeight: 180),
              margin: const EdgeInsets.only(top: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 6,
                  ),
                ],
              ),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _suggestions.length,
                itemBuilder: (context, index) {
                  final s = _suggestions[index];
                  String formatted = '';
                  if (s['address'] != null) {
                    formatted = _formatAddressData(s['address']);
                  }
                  if (formatted.isEmpty) {
                    final disp = (s['display_name'] ?? '').toString();
                    final segs = disp.split(',').map((e) => e.trim()).toList();
                    formatted = segs.take(3).join(', ');
                  }

                  return ListTile(
                    leading: const Icon(LucideIcons.mapPin),
                    title: Text(
                      formatted,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      (s['display_name'] ?? '').toString(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10, color: Colors.grey),
                    ),
                    onTap: () {
                      final lat =
                          double.tryParse(s['lat'] ?? '') ??
                          _latitude ??
                          -23.55052;
                      final lon =
                          double.tryParse(s['lon'] ?? '') ??
                          _longitude ??
                          -46.633308;
                      setState(() {
                        _latitude = lat;
                        _longitude = lon;
                        _address = formatted;
                        _addressController.text = _address!;
                        _suggestions = [];
                        _chooseOtherAddress = false;
                      });
                      _mapController.move(LatLng(lat, lon), 15);
                      _geoDebounce?.cancel();
                    },
                  );
                },
              ),
            ),

          const SizedBox(height: 16),

          SizedBox(
            height: 300,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: LatLng(
                        _latitude ?? -23.550520,
                        _longitude ?? -46.633308,
                      ),
                      initialZoom: 18,
                      onTap: (tapPos, latLng) {
                        _mapController.move(latLng, 15);
                        setState(() {
                          _latitude = latLng.latitude;
                          _longitude = latLng.longitude;
                          _addressController.text = 'Buscando endereço...';
                          _chooseOtherAddress = false;
                        });
                        _geoDebounce?.cancel();
                        _geoDebounce = Timer(
                          const Duration(milliseconds: 600),
                          () {
                            if (_latitude != null && _longitude != null) {
                              _reverseGeocode(_latitude!, _longitude!);
                            }
                          },
                        );
                      },
                      onPositionChanged: (camera, hasGesture) {
                        if (hasGesture) {
                          setState(() {
                            _latitude = camera.center.latitude;
                            _longitude = camera.center.longitude;
                            _addressController.text = 'Buscando endereço...';
                            _chooseOtherAddress = false;
                          });
                          _geoDebounce?.cancel();
                          _geoDebounce = Timer(
                            const Duration(milliseconds: 600),
                            () {
                              if (_latitude != null && _longitude != null) {
                                _reverseGeocode(_latitude!, _longitude!);
                              }
                            },
                          );
                        }
                      },
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        subdomains: const ['a', 'b', 'c'],
                        userAgentPackageName: 'com.play101.app',
                      ),
                    ],
                  ),
                  Icon(
                    Icons.location_on,
                    color: Theme.of(context).primaryColor,
                    size: 40,
                  ),
                  Positioned(
                    right: 16,
                    bottom: 16,
                    child: FloatingActionButton(
                      heroTag: 'my_location_fab',
                      mini: true,
                      backgroundColor: Colors.white,
                      foregroundColor: Theme.of(context).primaryColor,
                      onPressed: () => _useMyLocation(),
                      child: const Icon(Icons.my_location),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: (_latitude != null && _longitude != null)
                  ? _nextStep
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF6C00),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text('Continuar'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewStep() {
    final totalValue = _aiTaskPrice ?? _priceEstimated;
    final upfrontValue = totalValue * 0.30;
    final restanteRaw = totalValue - upfrontValue;
    final restante = restanteRaw < 0 ? 0.0 : restanteRaw;

    String formatBRL(double v) {
      final s = v.toStringAsFixed(2);
      return 'R\$ ${s.replaceAll('.', ',')}';
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Confirmar serviço',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const Text(
            'Revise os detalhes para confirmar',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),

          Container(
            padding: const EdgeInsets.all(24),
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
                // Linha: Profissão
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Profissão',
                      style: TextStyle(color: Colors.grey),
                    ),
                    Flexible(
                      child: Text(
                        _selectedProfession ?? 'Indefinida',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12.0),
                  child: Divider(),
                ),

                // Detalhes do Pedido
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Local do Serviço',
                      style: TextStyle(color: Colors.grey),
                    ),
                    Expanded(
                      child: Text(
                        _addressController.text.isEmpty
                            ? (_address ?? 'Não Informado')
                            : _addressController.text,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Descrição',
                      style: TextStyle(color: Colors.grey),
                    ),
                    Flexible(
                      child: Text(
                        _descriptionController.text.isEmpty
                            ? 'Sem descrição'
                            : _descriptionController.text,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                  ],
                ),
                if (_imageKeys.isNotEmpty ||
                    _videoKey != null ||
                    _audioKeys.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Flexible(
                        child: Text(
                          'Mídias Anexadas',
                          style: TextStyle(color: Colors.grey),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Flexible(
                        child: Text(
                          '${_imageKeys.length} img, ${_videoKey != null ? 1 : 0} vid, ${_audioKeys.length} aud',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],

                // Show AI Task Name if available
                if (_aiTaskName != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Serviço Identificado',
                        style: TextStyle(color: Colors.grey),
                      ),
                      Flexible(
                        child: Text(
                          _aiTaskName!,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],

                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16.0),
                  child: Divider(),
                ),

                // Valores (Comum a ambos)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Valor Total',
                      style: TextStyle(color: Colors.grey),
                    ),
                    Flexible(
                      child: Text(
                        formatBRL(totalValue),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Flexible(
                      child: Text(
                        'Entrada (30%)',
                        style: TextStyle(color: Colors.grey),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Flexible(
                      child: Text(
                        formatBRL(upfrontValue),
                        style: TextStyle(
                          color: Theme.of(context).primaryColor,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Flexible(
                      child: Text(
                        'Restante (No local)',
                        style: TextStyle(color: Colors.grey),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Flexible(
                      child: Text(
                        formatBRL(restante),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryOrange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        LucideIcons.lightbulb,
                        color: Theme.of(context).primaryColor,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Você paga agora a entrada de ${formatBRL(upfrontValue)}. '
                          'O restante de ${formatBRL(restante)} será pago no local/conclusão. '
                          'O valor só é liberado ao prestador após a conclusão do serviço.',
                          style: const TextStyle(
                            color: Colors.black87,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF6C00),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              onPressed: _isLoading ? null : _submitService,
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text('Confirmar serviço'),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft, color: Colors.black),
          onPressed: _prevStep,
        ),
        title: const Text(
          'Solicitar serviço',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Theme.of(context).primaryColor,
        elevation: 0,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            // Top Yellow Area
            Container(
              height: 100,
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Passo $_currentStep de 3',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: LinearProgressIndicator(
                      value: _currentStep / 3,
                      color: Colors.black87,
                      backgroundColor: Colors.black.withValues(alpha: 0.05),
                      minHeight: 8,
                    ),
                  ),
                  const SizedBox(height: 32),
                  Expanded(child: _buildContent()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _onDescriptionChanged(String v) {
    _aiDebounce?.cancel();
    setState(() {
      _showTeach = false;
    });
    _aiDebounce = Timer(const Duration(milliseconds: 500), () async {
      await _classifyAi();
    });
  }

  Future<void> _classifyAi() async {
    // Evita chamar a API se o texto for muito curto (validação client-side)
    if (_descriptionController.text.trim().length < 6) {
      return;
    }

    try {
      setState(() => _aiClassifying = true);
      await _api.loadToken();
      final addrRaw = _addressController.text.isEmpty
          ? (_address ?? '')
          : _addressController.text;
      final addressSafe = addrRaw.length > 255
          ? addrRaw.substring(0, 255)
          : addrRaw;
      final body = {
        'text': _descriptionController.text,
        if (_latitude != null)
          'latitude': double.parse(_latitude!.toStringAsFixed(8)),
        if (_longitude != null)
          'longitude': double.parse(_longitude!.toStringAsFixed(8)),
        if (addressSafe.isNotEmpty) 'address': addressSafe,
        if (_imageKeys.isNotEmpty) 'images': _imageKeys,
        if (_videoKey != null) 'video': _videoKey,
        if (_audioKeys.isNotEmpty) 'audios': _audioKeys,
      };
      final r = await _api.post('/services/ai/classify', body);
      if (r['encontrado'] == true) {
        setState(() {
          _aiCategoryId = (r['categoria_id'] as num?)?.toInt();
          _aiCategoryName = r['categoria']?.toString();
          _aiProfessionName = r['profissao']?.toString();
          _aiConfidence = r['confianca'] is num
              ? (r['confianca'] as num).toDouble()
              : null;

          if (r['task'] != null) {
            final task = r['task'];
            _aiTaskId = (task['id'] as num?)?.toInt();
            _aiTaskName = task['name']?.toString();
            _aiTaskPrice = task['unit_price'] is num
                ? (task['unit_price'] as num).toDouble()
                : double.tryParse(task['unit_price']?.toString() ?? '0');
            _aiSuggestionMessage = r['sugestao_servico']?.toString();
            _needsDetails = false;
          } else {
            _aiTaskId = null;
            _aiTaskName = null;
            _aiTaskPrice = null;
            _needsDetails = r['needs_details'] == true;
            _aiSuggestionMessage =
                r['message']?.toString() ??
                "Encontrei o profissional $_aiProfessionName, mas preciso de mais detalhes para calcular o valor.";
          }
          final rawType = r['service_type']?.toString();
          if (rawType == 'at_provider' ||
              rawType == 'medical' ||
              rawType == 'salon') {
            // Keep legacy checks just in case, but at_provider is the standard now
            _aiServiceType = 'at_provider';
          } else {
            _aiServiceType = rawType;
          }

          // Fallback robusto no client-side para garantir fluxo correto
          final nameLower = (_aiProfessionName ?? '').toLowerCase();
          if (nameLower.contains('barbeiro') ||
              nameLower.contains('cabeleireiro') ||
              nameLower.contains('manicure') ||
              nameLower.contains('pedicure') ||
              nameLower.contains('dentista') ||
              nameLower.contains('médic') ||
              nameLower.contains('nutri') ||
              nameLower.contains('fisiot') ||
              nameLower.contains('esteticista')) {
            _aiServiceType = 'at_provider';
          }
        });
      } else {
        setState(() {
          _aiCategoryId = null;
          _aiCategoryName = null;
          _aiProfessionName = null;
          _aiConfidence = null;
          _aiTaskId = null;
          _aiTaskName = null;
          _aiTaskPrice = null;
          _needsDetails = false;
          _aiSuggestionMessage = r['message']?.toString();
        });
        await _ensureProfessionsLoaded();
      }
      if (_aiServiceType == 'at_provider' && _aiProfessionName != null) {
        _fetchProviders(_aiProfessionName!); // Fetch providers and their slots
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToProviders();
        });
      }
    } catch (e, stack) {
      debugPrint('Erro na classificação IA: $e\n$stack');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao conectar com a IA: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _aiClassifying = false;
          _hasAiRun = true;
        });
      }
    }
  }

  void _onProfessionSearchChanged(String v) {
    final q = v.trim().toLowerCase();
    if (q.isEmpty) {
      // Se vazio, mostra todas (ou as primeiras 50) para o usuário escolher
      setState(() {
        _filteredProfessions = _allProfessions.take(50).toList();
      });
      return;
    }
    setState(() {
      _filteredProfessions = _allProfessions
          .where((p) => p.toLowerCase().contains(q))
          .take(20)
          .toList();
    });
  }

  List<Widget> _buildGroupedProfessionItems() {
    final Map<String, List<String>> grouped = {};
    for (final name in _filteredProfessions) {
      final label = _extractGroupLabel(name);
      final list = grouped[label] ?? <String>[];
      list.add(name);
      grouped[label] = list;
    }
    final preferredOrder = [
      'Cuidados',
      'Professor',
      'Serviços',
      'Instalação',
      'Manutenção',
    ];
    final keys = grouped.keys.toList();
    keys.sort((a, b) {
      final ai = preferredOrder.indexOf(a);
      final bi = preferredOrder.indexOf(b);
      if (ai != -1 && bi != -1) return ai.compareTo(bi);
      if (ai != -1) return -1;
      if (bi != -1) return 1;
      return a.compareTo(b);
    });
    final List<Widget> children = [];
    for (final k in keys) {
      children.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
          child: Text(k, style: const TextStyle(fontWeight: FontWeight.bold)),
        ),
      );
      for (final p in grouped[k]!) {
        children.add(
          ListTile(
            leading: const Icon(LucideIcons.user),
            title: Text(p),
            onTap: () => _selectManualProfession(p),
          ),
        );
      }
    }
    return children;
  }

  String _extractGroupLabel(String name) {
    final s = name.toLowerCase();
    if (s.startsWith('cuidados com ')) return 'Cuidados';
    if (s.startsWith('professor de ')) return 'Professor';
    if (s.startsWith('serviços de ')) return 'Serviços';
    if (s.startsWith('instalação de ')) return 'Instalação';
    if (s.startsWith('manutenção de ')) return 'Manutenção';
    final iDe = s.indexOf(' de ');
    final iCom = s.indexOf(' com ');
    int cut;
    if (iDe != -1 && iCom != -1) {
      cut = iDe < iCom ? iDe : iCom;
    } else {
      cut = iDe != -1 ? iDe : iCom;
    }
    if (cut != -1) {
      final prefix = name.substring(0, cut).trim();
      if (prefix.isEmpty) return name;
      final first = prefix.substring(0, 1);
      final rest = prefix.substring(1);
      return first.toUpperCase() + rest;
    }
    final firstSpace = name.indexOf(' ');
    if (firstSpace != -1) {
      final prefix = name.substring(0, firstSpace);
      final first = prefix.substring(0, 1);
      final rest = prefix.substring(1).toLowerCase();
      return first.toUpperCase() + rest;
    }
    return name;
  }

  Future<void> _ensureProfessionsLoaded() async {
    if (_allProfessions.isEmpty) {
      try {
        final list = await _api.getProfessions();
        _allProfessions = list.map((e) => e['name'].toString()).toList();
        for (final item in list) {
          final name = item['name'].toString();
          final catId = item['category_id'] as int?;
          if (catId != null) {
            _professionCategoryMap[name] = catId;
          }
        }
      } catch (_) {}
    }
    _onProfessionSearchChanged(_professionSearchController.text);
  }

  Future<void> _selectManualProfession(String name) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      // 1. Atualiza a UI imediatamente com a escolha do usuário
      setState(() {
        _aiProfessionName = name;
        _aiConfidence = 1.0; // Confiança máxima pois foi escolha manual
        if (_professionCategoryMap.containsKey(name)) {
          _aiCategoryId = _professionCategoryMap[name];
        }
        _showTeach = false; // Fecha a área de correção
        _professionSearchController.clear();
        _filteredProfessions = [];
      });

      // 2. Busca a categoria correta na IA usando o nome da profissão
      try {
        final r = await _api.post('/services/ai/classify', {'text': name});
        debugPrint('Manual selection response: $r'); // DEBUG
        if (r['encontrado'] == true) {
          if (mounted) {
            setState(() {
              _aiCategoryId = (r['categoria_id'] as num?)?.toInt();
              if (r['categoria'] != null) {
                _aiCategoryName = r['categoria'].toString();
              }
              
              // NEW: Extract task info if available, same as _classifyAi
              if (r['task'] != null) {
                final task = r['task'];
                _aiTaskId = (task['id'] as num?)?.toInt();
                _aiTaskName = task['name']?.toString();
                _aiTaskPrice = task['unit_price'] is num
                    ? (task['unit_price'] as num).toDouble()
                    : double.tryParse(task['unit_price']?.toString() ?? '0');
                 debugPrint('DEBUG: Manual Task SET -> ID: $_aiTaskId, Name: $_aiTaskName, Price: $_aiTaskPrice');
              } else {
                 _aiTaskId = null;
                 debugPrint('DEBUG: Manual Task NULL (no task in response)');
              }
            });
          }
        }
      } catch (e) {
        debugPrint('Erro ao classificar profissão manual: $e');
      }

      // Fallback: Se ainda não temos ID, tenta usar o mapa estático
      if (_aiCategoryId == null && mounted) {
        setState(() {
          if (_fallbackCategories.containsKey(name)) {
            _aiCategoryId = _fallbackCategories[name];
          } else if (_aiCategoryName != null &&
              _fallbackCategories.containsKey(_aiCategoryName)) {
            _aiCategoryId = _fallbackCategories[_aiCategoryName];
          } else {
            // Último recurso: Categoria Geral (1)
            _aiCategoryId = 1;
          }
        });
      }

      // 3. Envia para a IA aprender em background (sem bloquear/loading)
      // Não precisamos esperar o token ou o post para atualizar a tela
      _api.loadToken().then((_) {
        _api
            .post('/services/ai/teach', {
              'text': _descriptionController.text,
              'profession_name': name,
              if (_aiCategoryId != null) 'category_id': _aiCategoryId,
            })
            .catchError((e) {
              debugPrint('Erro ao ensinar IA: $e');
              return <String, dynamic>{};
            });
      });

      // Não chamamos _classifyAi() novamente para não sobrescrever a escolha manual
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Erro: ${e.toString()}')));
    }
  }

  Widget _buildFixedProvidersList() {
    String nextAvailableTimeForProviderId(int providerId) {
      return _nextAvailableTimes[providerId] ?? '';
    }

    return Column(
      key: _providersKey,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: Text(
            'Profissionais Próximos ($_aiProfessionName)',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 8.0),
          child: Text(
            'Você pode escolher outro profissional ou alterar a data para mais opções.',
            style: const TextStyle(color: Colors.grey, fontSize: 12),
          ),
        ),
        if (_aiTaskName != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: Row(
              children: [
                const Icon(LucideIcons.briefcase, size: 16, color: Colors.grey),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Serviço: $_aiTaskName',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ..._providers.map((p) {
          final idx = _providers.indexOf(p);
          final id = (p['id'] as num?)?.toInt();
          final nextTime = id != null ? nextAvailableTimeForProviderId(id) : '';
          final name =
              (p['commercial_name'] ?? p['full_name'] ?? 'Profissional')
                  as String;
          final rating = p['rating_avg'] ?? 0;
          final reviews = p['rating_count'] ?? 0;
          final distanceKm = p['distance_km'];
          final distanceStr = distanceKm is num
              ? '${distanceKm.toStringAsFixed(1)} km'
              : '—';
          final timeMin = distanceKm is num
              ? (distanceKm / 30 * 60).round()
              : null;
          final timeStr = timeMin != null ? '$timeMin min' : '—';
          final isExpanded = _selectedProviderIndex == idx;
          return Card(
            clipBehavior: Clip.antiAlias,
            color: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Colors.black, width: 1),
            ),
            margin: const EdgeInsets.only(bottom: 12),
            child: Column(
              children: [
                InkWell(
                  onTap: () {
                    setState(() {
                      if (_selectedProviderIndex == idx) {
                        // Close if already open
                        _selectedProviderIndex = null;
                        _selectedProviderId = null;
                      } else {
                        // Open this one and close others
                        _selectedProviderIndex = idx;
                        _selectedProviderId = id;
                      }
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.grey[200],
                          child: const Icon(
                            LucideIcons.user,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (_aiTaskName != null)
                                Padding(
                                  padding: const EdgeInsets.only(
                                    top: 2.0,
                                    bottom: 2.0,
                                  ),
                                  child: Text(
                                    'Serviço: $_aiTaskName',
                                    style: TextStyle(
                                      color: Colors.grey[700],
                                      fontSize: 12,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              Row(
                                children: [
                                  const Icon(
                                    LucideIcons.mapPin,
                                    size: 14,
                                    color: Colors.grey,
                                  ),
                                  const SizedBox(width: 4),
                                  Text('$distanceStr • $timeStr'),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.star,
                                    size: 14,
                                    color: Colors.amber,
                                  ),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    flex: 2,
                                    child: Text(
                                      '$rating ($reviews avaliações)',
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 1,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  if (nextTime.isNotEmpty)
                                    Flexible(
                                      flex: 1,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.green.withValues(
                                            alpha: 0.1,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                        child: Text(
                                          'Próximo: $nextTime',
                                          style: const TextStyle(
                                            color: Colors.green,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                          maxLines: 1,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          isExpanded
                              ? LucideIcons.chevronUp
                              : LucideIcons.chevronDown,
                          color: Colors.grey,
                        ),
                      ],
                    ),
                  ),
                ),
                if (isExpanded)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16.0,
                      vertical: 8.0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Divider(),
                        const SizedBox(height: 8),
                        const Text(
                          'Avaliações',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        ...List.generate(3, (i) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6.0),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.person,
                                  size: 14,
                                  color: Colors.grey,
                                ),
                                const SizedBox(width: 6),
                                const Expanded(
                                  child: Text(
                                    'Ótimo atendimento e serviço de qualidade.',
                                    style: TextStyle(fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFEF6C00),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: () async {
                              setState(() => _selectedProviderIndex = idx);
                              if (id != null) {
                                setState(() => _selectedProviderId = id);
                              }
                              
                              // Save session data as requested
                              try {
                                final prefs = await SharedPreferences.getInstance();
                                final draftData = {
                                  'type': 'draft_service_request',
                                  'provider_id': id,
                                  'provider_name': name,
                                  'category_id': _aiCategoryId,
                                  'profession_name': _aiProfessionName,
                                  'description': _descriptionController.text,
                                  'address': _addressController.text,
                                  'lat': _latitude,
                                  'lon': _longitude,
                                  'saved_at': DateTime.now().toIso8601String(),
                                  'is_today': true, // Marking as immediate interest
                                };
                                await prefs.setString('current_service_draft', jsonEncode(draftData));
                                debugPrint('Draft service saved to localStorage: $draftData');
                              } catch (e) {
                                debugPrint('Error saving draft: $e');
                              }

                              _nextStep();
                            },
                            child: const Text('Selecionar este profissional'),
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
