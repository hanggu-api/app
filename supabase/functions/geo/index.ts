import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../services/uber_service.dart';
import '../../services/map_service.dart';
import '../../core/config/supabase_config.dart';
import '../../services/theme_service.dart';
import '../../services/api_service.dart';
import '../../core/theme/app_theme.dart';

class UberRequestScreen extends StatefulWidget {
    const UberRequestScreen({ super.key });

    @override
    State<UberRequestScreen> createState() => _UberRequestScreenState();
}

class _UberRequestScreenState extends State<UberRequestScreen> {
  final UberService _uberService = UberService();
  final MapController _mapController = MapController();
  final ApiService _api = ApiService();
  final TextEditingController _pickupController = TextEditingController();
  final TextEditingController _dropoffController = TextEditingController();
  final FocusNode _pickupFocus = FocusNode();
  final FocusNode _dropoffFocus = FocusNode();
  
  Timer?_debouncer;
    List<dynamic> _searchResults = [];
  bool _isSearchingLocation = false;
  bool _isPickingOnMap = false;
  bool _locationError = false;
  bool _selectingPickup = true;
  bool _isLoading = false;
  int _selectedVehicleId = 1;
  String _selectedPaymentMethod = 'PIX';
  
  LatLng?_pickupLocation;
  LatLng?_dropoffLocation;
  double?_routeDistance;
  double?_routeDuration;
    List<LatLng> _routePoints = [];

    StreamSubscription<List<Map<String, dynamic>>>? _onlineDriversSubscription;
List < Map < String, dynamic >> _onlineDrivers =[];
  final Map < int, int > _driverVehicleTypes = { };
Map<String, dynamic> ? _fareEstimate;

  // ============================================
  // CACHE PARA NOMINATIM (reduz chamadas à API)
  // ============================================
  final Map < String, _NominatimCache > _nominatimCache = { };

class _NominatimCache {
    final Map<String, dynamic> data;
    final DateTime timestamp;
    _NominatimCache(this.data, this.timestamp);
}

  final List < Map < String, dynamic >> predefinedVehicles =[
    {
        'id': 1,
        'name': 'Carro',
        'icon': Icons.directions_car,
        'asset': 'assets/icons/036-car.png',
    },
    {
        'id': 3,
        'name': 'Moto',
        'icon': Icons.directions_bike,
        'asset': 'assets/icons/034-motorbike.png',
    },
];

@override
void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) ThemeService().setNavBarVisible(false);
    });
    _pickupFocus.addListener(_onFocusChange);
    _dropoffFocus.addListener(_onFocusChange);
    _getCurrentLocation();
    _startWatchingOnlineDrivers();
}

void _onFocusChange() {
    if (!mounted) return;
    setState(() {
        if (_dropoffFocus.hasFocus) {
            _selectingPickup = false;
        } else if (_pickupFocus.hasFocus) {
            _selectingPickup = true;
        }
    });
}

void _onPickingLocationChanged(LatLng location) {
    if (_debouncer?.isActive ?? false) _debouncer!.cancel();
    _debouncer = Timer(const Duration(milliseconds: 600), () async {
        try {
        final addressData = await _api.reverseGeocode(
            location.latitude,
            location.longitude,
        );
            if (mounted) {
          String address = 'Local selecionado';
                if (addressData['display_name'] != null) {
                    address = addressData['display_name'].toString();
                } else if (addressData['address'] != null &&
                    addressData['address'] is Map) {
            final addr = addressData['address'] as Map;
            final road = addr['road'] ?? '';
            final suburb = addr['suburb'] ?? addr['neighbourhood'] ?? '';
                    if (road.isNotEmpty) {
                        address = road + (suburb.isNotEmpty ? ', $suburb' : '');
                    } else {
                        address = suburb.isNotEmpty ? suburb : 'Local selecionado';
                    }
                }
                setState(() {
                    if (_selectingPickup) {
                        _pickupLocation = location;
                        _pickupController.text = address;
                    } else {
                        _dropoffLocation = location;
                        _dropoffController.text = address;
                    }
                });
            }
        } catch (e) {
            debugPrint('Erro no reverse geocode ao mover: $e');
        }
    });
}

Future < void> _getCurrentLocation() async {
    if (mounted) {
        setState(() {
            _locationError = false;
            _pickupController.text = 'Buscando sua localização...';
        });
    }
    if (kIsWeb) {
        await _getCurrentLocationWeb();
        return;
    }
    Position ? pos;
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
        if (!serviceEnabled) {
            if (mounted)
                setState(() {
                    _locationError = true;
                    _pickupController.clear();
                });
            return;
        }
      LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
            permission = await Geolocator.requestPermission();
            if (permission == LocationPermission.denied) {
                if (mounted)
                    setState(() {
                        _locationError = true;
                        _pickupController.clear();
                    });
                return;
            }
        }
        if (permission == LocationPermission.deniedForever) {
            if (mounted)
                setState(() {
                    _locationError = true;
                    _pickupController.clear();
                });
            return;
        }
        pos = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
                accuracy: LocationAccuracy.high,
                timeLimit: Duration(seconds: 10),
        ),
      ).timeout(const Duration(seconds: 12));
    } catch (e) {
        debugPrint('GPS Error ($e)');
        if (mounted)
            setState(() {
                _locationError = true;
                _pickupController.clear();
            });
        return;
    }
    if (!mounted) return;
    final double lat = pos.latitude;
    final double lng = pos.longitude;
    setState(() {
        _pickupLocation = LatLng(lat, lng);
        _mapController.move(_pickupLocation!, 15);
        _pickupController.text = 'Identificando endereço...';
    });
    try {
      final res = await _api.reverseGeocode(lat, lng);
        if (mounted) {
            setState(() {
          String address = 'Meu Local';
                if (res['display_name'] != null) {
                    address = res['display_name'].toString();
                } else if (res['address'] != null && res['address'] is Map) {
            final addr = res['address'] as Map;
            final road = addr['road'] ?? '';
            final suburb = addr['suburb'] ?? addr['neighbourhood'] ?? '';
                if (road.isNotEmpty) {
                    address = road + (suburb.isNotEmpty ? ', $suburb' : '');
                } else {
                    address = suburb.isNotEmpty ? suburb : 'Meu Local';
                }
            }
            _pickupController.text = address;
        });
    }
    } catch (e) {
    if (mounted) {
        setState(() {
            _pickupController.text =
                'Meu Local (${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)})';
        });
    }
}
  }

Future < void> _getCurrentLocationWeb() async {
    Position ? pos;
    try {
        pos = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
                accuracy: LocationAccuracy.medium,
                timeLimit: Duration(seconds: 20),
        ),
      ).timeout(const Duration(seconds: 21));
    } catch (e) {
        if (mounted) _enableManualPickup();
        return;
    }
    if (!mounted) {
        _enableManualPickup();
        return;
    }
    final double lat = pos.latitude;
    final double lng = pos.longitude;
    setState(() {
        _pickupLocation = LatLng(lat, lng);
        _locationError = false;
        _mapController.move(_pickupLocation!, 15);
        _pickupController.text = 'Identificando endereço...';
    });
    try {
      final res = await _api.reverseGeocode(lat, lng);
        if (mounted) {
        final address = res['display_name']?.toString() ?? 'Meu Local';
            setState(() => _pickupController.text = address);
        }
    } catch (e) {
        if (mounted) {
            setState(
                () => _pickupController.text =
                    'Meu Local (${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)})',
            );
        }
    }
}

void _enableManualPickup() {
    setState(() {
        _locationError = true;
        _pickupController.text = '';
    });
    _pickupFocus.requestFocus();
}

void _onSearchQueryChanged(String query) {
    if (_debouncer?.isActive ?? false) _debouncer!.cancel();
    _debouncer = Timer(const Duration(milliseconds: 600), () async {
      final text = query.trim();
        if (text.length < 3) {
            if (mounted) setState(() => _searchResults = []);
            return;
        }
        if (mounted) setState(() => _isSearchingLocation = true);
        try {
        final rawResults = await _api.searchAddress(
            text,
            lat: _pickupLocation?.latitude,
            lon: _pickupLocation?.longitude,
        );
        final enriched = await _enrichTomTomResults(rawResults);
            if (mounted) setState(() => _searchResults = enriched);
        } catch (e) {
            debugPrint('Erro na busca: $e');
        } finally {
            if (mounted) setState(() => _isSearchingLocation = false);
        }
    });
}

  IconData _getCategoryIcon(String ? category) {
    if (category == null) return Icons.location_on_rounded;
    final cat = category.toUpperCase();
    if (cat.contains('MARKET') || cat.contains('SHOPPING'))
        return Icons.shopping_cart_rounded;
    if (cat.contains('RESTAURANT') ||
        cat.contains('FOOD') ||
        cat.contains('EAT'))
        return Icons.restaurant_rounded;
    if (cat.contains('GAS') || cat.contains('FUEL'))
        return Icons.local_gas_station_rounded;
    if (cat.contains('PHARMACY') || cat.contains('HEALTH'))
        return Icons.local_pharmacy_rounded;
    if (cat.contains('PARK') || cat.contains('SQUARE'))
        return Icons.park_rounded;
    if (cat.contains('HOSPITAL')) return Icons.local_hospital_rounded;
    if (cat.contains('BANK') || cat.contains('ATM'))
        return Icons.account_balance_outlined;
    if (cat.contains('HOTEL')) return Icons.hotel_rounded;
    if (cat.contains('SCHOOL') || cat.contains('UNIVERSITY'))
        return Icons.school_rounded;
    if (cat.contains('CHURCH')) return Icons.church_rounded;
    if (cat.contains('BAR')) return Icons.local_bar_rounded;
    return Icons.business_rounded;
}

  Color _getCategoryColor(String ? category) {
    if (category == null) return const Color(0xFF427CF0);
    final cat = category.toUpperCase();
    if (cat.contains('MARKET') || cat.contains('SHOPPING'))
        return const Color(0xFF4CAF50);
    if (cat.contains('RESTAURANT') ||
        cat.contains('FOOD') ||
        cat.contains('EAT'))
        return const Color(0xFFFF9800);
    if (cat.contains('GAS') || cat.contains('FUEL'))
        return const Color(0xFFFFC107);
    if (cat.contains('PHARMACY') || cat.contains('HEALTH'))
        return const Color(0xFFF44336);
    if (cat.contains('PARK') || cat.contains('SQUARE'))
        return const Color(0xFF4CAF50);
    if (cat.contains('HOSPITAL')) return const Color(0xFFF44336);
    if (cat.contains('BANK') || cat.contains('ATM'))
        return const Color(0xFF2196F3);
    if (cat.contains('HOTEL')) return const Color(0xFF3F51B5);
    if (cat.contains('TRANSPORT')) return const Color(0xFF427CF0);
    return const Color(0xFF7D8FB3);
}

// ============================================
// MÉTODO PRINCIPAL: Enriquecimento dos Resultados
// ============================================
Future < List < Map < String, dynamic >>> _enrichTomTomResults(
    List < dynamic > data,
) async {
    final rawResults = data.map<Map<String, dynamic>>((item) {
    return {
        'address': item['address'] ?? {},
        'poi': item['poi'],
        'lat': item['position'] ? ['lat'],
        'lon': item['position'] ? ['lon'],
        'dist': item['dist'],
        'category': item['poi'] ? ['categories']?.isNotEmpty == true
            ? item['poi']['categories'][0].split('/').last
            : null,
    };
}).toList();

    return Future.wait(
        rawResults.map((raw) async {
            final address = raw['address'];
            final poi = raw['poi'];
            final lat = raw['lat'];
            final lon = raw['lon'];

            debugPrint(
          '🔍 [SearchEnrich] Item: ${poi?["name"] ?? address["streetName"] ?? "???"} - Address data: ${jsonEncode(address)}',
            );

        // ============================================
        // 1. EXTRAI BAIRRO VIA NOMINATIM (PRIMÁRIO)
        // ============================================
        String? bairro;
            String bairroFonte = 'nenhuma';
            Map<String, dynamic>?nominatimResponse;

            if(lat != null && lon != null) {
        try {
            // Verifica cache primeiro
            final cacheKey = '${lat.toStringAsFixed(5)},${lon.toStringAsFixed(5)}';
            final cached = _nominatimCache[cacheKey];

            if(cached != null &&
            DateTime.now().difference(cached.timestamp) < const Duration(minutes: 10)) {
        debugPrint('💾 [BAIRRO] Usando cache para: $cacheKey');
        nominatimResponse = cached.data;
    } else {
        // ============================================
        // CHAMADA À API NOMINATIM
        // ============================================
        if (kIsWeb) {
            // Web: Usa Edge Function do Supabase
            nominatimResponse = await _api.reverseGeocode(lat, lon);
            debugPrint(
                '🌐 [NOMINATIM] Resposta RAW (Web): ${jsonEncode(nominatimResponse)}',
            );
        } else {
                // Mobile: Chama Nominatim diretamente com parâmetros CORRETOS
                final url = Uri.parse(
            'https://nominatim.openstreetmap.org/reverse?'
                  'lat=$lat&'
                  'lon=$lon&'
                  'format=json&'
                  'addressdetails=1&'      // ← ESSENCIAL para componentes do endereço
                  'zoom=14&'               // ← Foca no nível de bairro
                  'accept-language=pt-BR', // ← Nomes em português
        );

            debugPrint('📱 [NOMINATIM] URL: $url');
                
                final response = await http.get(
                url,
                headers: {
                'User-Agent': 'UberTripApp/1.0 (contato@seuapp.com)', // ← OBRIGATÓRIO
            },
            ).timeout(const Duration(seconds: 5));

            if (response.statusCode == 200) {
                nominatimResponse = json.decode(response.body);
                debugPrint(
                    '📱 [NOMINATIM] Resposta RAW (Mobile): ${jsonEncode(nominatimResponse)}',
                );

                // LOG DETALHADO DO OBJETO ADDRESS
                if (nominatimResponse != null && nominatimResponse!['address'] != null) {
                    final addr = nominatimResponse!['address'] as Map;
                    debugPrint('🏘️ [NOMINATIM] Chaves disponíveis em address:');
                    addr.forEach((key, value) {
                        debugPrint('   • $key: "$value"');
                    });
                }
            } else {
                debugPrint('❌ [NOMINATIM] Erro HTTP ${response.statusCode}: ${response.body}');
            }
        }

        // Salva no cache
        if (nominatimResponse != null) {
            _nominatimCache[cacheKey] = _NominatimCache(
                nominatimResponse!,
                DateTime.now()
            );
            // Limpa cache antigo se passar de 50 entradas
            if (_nominatimCache.length > 50) {
                  final oldest = _nominatimCache.entries
                    .reduce((a, b) => a.value.timestamp.isBefore(b.value.timestamp) ? a : b)
                    .key;
                _nominatimCache.remove(oldest);
            }
        }
    }

    // ============================================
    // EXTRAI BAIRRO DA RESPOSTA
    // ============================================
    if (nominatimResponse != null && nominatimResponse!['address'] != null) {
              final addr = nominatimResponse!['address'] as Map;
        print(ainal addr);
        // Ordem de prioridade para Brasil
        bairro =
            addr['suburb'] ??           // Bairros urbanos (ex: "Bacuri", "Centro")
            addr['neighbourhood'] ??    // Vizinhanças menores
            addr['neighborhood'] ??     // Variação em inglês
            addr['city_district'] ??    // Distritos da cidade
            addr['district'] ??         // Distritos gerais
            addr['quarter'] ??          // Quarteirões/áreas
            addr['village'] ??          // Vilas (áreas rurais)
            addr['town'] ??             // Cidades pequenas
            addr['hamlet'];             // Aldeias

        if (bairro != null && bairro.toString().isNotEmpty) {
            bairroFonte = kIsWeb ? 'nominatim_web' : 'nominatim_mobile';
            debugPrint('✅ [BAIRRO] Encontrado: "$bairro" (fonte: $bairroFonte)');
        } else {
            debugPrint('⚠️ [BAIRRO] Não encontrado nas chaves padrão do Nominatim');
        }
    }
} catch (e, stack) {
    debugPrint('❌ [NOMINATIM] Erro na requisição: $e');
    debugPrint('📋 Stack: $stack');
}
        }

// ============================================
// 2. FALLBACK: TomTom (caso Nominatim falhe)
// ============================================
if (bairro == null || bairro.isEmpty) {
    bairro =
        address['municipalitySubdivision'] ??
        address['neighbourhood'] ??
        address['subdivisionName'] ??
        address['countrySecondarySubdivision'];

    if (bairro != null && bairro.toString().isNotEmpty) {
        bairroFonte = 'tomtom_fallback';
        debugPrint('🔄 [BAIRRO] Fallback TomTom: "$bairro"');
    }
}

// ============================================
// 3. LAST RESORT: Extrair do freeformAddress
// ============================================
if ((bairro == null || bairro.isEmpty) &&
    address['freeformAddress'] != null) {
    bairro = _extractBairroFromFreeform(address);
    if (bairro != null) {
        bairroFonte = 'freeform_parse';
        debugPrint('✨ [BAIRRO] Extraído do freeform: "$bairro"');
    }
}

        // ============================================
        // 4. LIMPEZA INTELIGENTE DO BAIRRO
        // ============================================
        String neighborhoodInfo = bairro ?? '';
        final String city = (address['municipality'] ?? '').toString();
        final String state = (address['countrySubdivisionName'] ??
    address['countrySubdivision'] ??
    '')
    .toString();

if (neighborhoodInfo.isNotEmpty) {
          String nb = neighborhoodInfo;

    // Remove cidade do texto do bairro
    if (city.isNotEmpty) {
            final reg = RegExp(RegExp.escape(city), caseSensitive: false);
        nb = nb.replaceAll(reg, '').trim();
    }

    // Remove estado do texto do bairro
    if (state.isNotEmpty) {
            final reg = RegExp(RegExp.escape(state), caseSensitive: false);
        nb = nb.replaceAll(reg, '').trim();
    }

    // Remove caracteres especiais no início/fim
    nb = nb.replaceAll(RegExp(r'^[, \-]+|[, \-]+$'), '').trim();

    // Valida se é um bairro válido
    if (nb.isNotEmpty &&
        nb.length > 2 &&
        !RegExp(r'^\d+$').hasMatch(nb) &&
        !RegExp(r'^\d{5}-\d{3}$').hasMatch(nb)) { // Rejeita CEP
        neighborhoodInfo = nb;
    } else {
        neighborhoodInfo = '';
    }
}

// ============================================
// 5. LOG FINAL PARA DEBUG
// ============================================
debugPrint(
    '🏘️ [BAIRRO] FINAL: "$neighborhoodInfo" | Fonte: $bairroFonte | City: "$city" | State: "$state"',
);

        // ============================================
        // 6. FORMATAÇÃO DO ENDEREÇO
        // ============================================
        String mainTitle =
    poi != null ? poi['name'] : (address['streetName'] ?? "Endereço");

List < String > streetParts =[];
if (address['streetName'] != null) {
          String s = address['streetName'];
    if (address['streetNumber'] != null)
        s += ' ${address['streetNumber']}';
    streetParts.add(s);
}
        String secondary = streetParts.join(', ');

if (neighborhoodInfo.isNotEmpty &&
    !secondary.toLowerCase().contains(neighborhoodInfo.toLowerCase())) {
    secondary = secondary.isNotEmpty
        ? '$secondary - $neighborhoodInfo'
        : neighborhoodInfo;
}

if (secondary.isEmpty && city.isNotEmpty) {
    secondary = city;
}

        double distKm = (raw['dist'] ?? 0) / 1000.0;
        int timeMin = (distKm * 1.5 + 2).ceil();

return {
    'main_text': mainTitle,
    'secondary_text': secondary,
    'bairro': neighborhoodInfo,
    'bairro_source': bairroFonte, // ← Para debug na UI
    'is_poi': poi != null,
    'display_name': '$mainTitle - $secondary',
    'lat': lat,
    'lon': lon,
    'dist_text': '${distKm.toStringAsFixed(1)} km',
    'time_text': '$timeMin min',
    'category': raw['category'],
};
      }).toList(),
    );
  }

// ============================================
// MÉTODO AUXILIAR: Extrair do freeformAddress
// ============================================
String ? _extractBairroFromFreeform(Map < dynamic, dynamic > address) {
    final String free = address['freeformAddress']?.toString() ?? '';
    final String city = (address['municipality'] ?? '').toString();

    if (city.isNotEmpty && free.contains(city)) {
      final parts = free.split(',').map((p) => p.trim()).toList();

        // Estratégia: bairro geralmente está antes da cidade
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].toLowerCase().contains(city.toLowerCase())) {
                if (i > 0) {
            final potential = parts[i - 1].trim();
                    // Rejeita números puros, CEPs e strings muito curtas
                    if (!RegExp(r'^\d+$').hasMatch(potential) &&
                        !RegExp(r'^\d{5}-\d{3}$').hasMatch(potential) &&
                        potential.length > 2 &&
                        potential.length < 50) {
                        return potential;
                    }
                }
                break;
            }
        }
    }
    return null;
}

void _selectSearchResult(dynamic result) {
    FocusScope.of(context).unfocus();
    final latObj = result['lat'];
    final lonObj = result['lon'];
    final display = result['display_name'] ?? result['main_text'] ?? '';
    double ? lat = latObj is num
        ? latObj.toDouble()
        : double.tryParse(latObj?.toString() ?? '');
    double ? lon = lonObj is num
        ? lonObj.toDouble()
        : double.tryParse(lonObj?.toString() ?? '');
    if (lat != null && lon != null) {
        setState(() {
            if (_selectingPickup) {
                _pickupLocation = LatLng(lat, lon);
                _pickupController.text = display;
                _mapController.move(_pickupLocation!, 15);
            } else {
                _dropoffLocation = LatLng(lat, lon);
                _dropoffController.text = display;
                _mapController.move(_dropoffLocation!, 16);
            }
            _searchResults = [];
        });
        Future.delayed(const Duration(milliseconds: 100), () {
            if (mounted) _calculateFare();
        });
    }
}

void _onMapTap(TapPosition tapPosition, LatLng point) async {
    if (_isPickingOnMap) return;
    setState(() {
        _selectingPickup = false;
        _dropoffLocation = point;
        _dropoffController.text = 'Buscando destino...';
        _searchResults = [];
        _calculateFare();
    });
    FocusScope.of(context).unfocus();
    try {
      final res = await _api.reverseGeocode(point.latitude, point.longitude);
        if (mounted) {
            setState(() {
          final address = res['display_name'] ?? 'Endereço selecionado';
                _dropoffController.text = address.toString();
            });
        }
    } catch (_) { }
}

Future < void> _calculateFare() async {
    if (_pickupLocation == null || _dropoffLocation == null) return;
    setState(() => _isLoading = true);
    try {
      final fareData = await _uberService.calculateFare(
        pickupLat: _pickupLocation!.latitude,
        pickupLng: _pickupLocation!.longitude,
        dropoffLat: _dropoffLocation!.latitude,
        dropoffLng: _dropoffLocation!.longitude,
        vehicleTypeId: _selectedVehicleId,
    );
      final routeData = await MapService().getRoute(
        _pickupLocation!,
        _dropoffLocation!,
    );
        setState(() {
            _fareEstimate = fareData;
            _routePoints = routeData['points'] as List<LatLng>;
            _routeDistance = routeData['distance'] as double?;
            _routeDuration = routeData['duration'] as double?;
        });
        _fitMapToRoute();
    } catch (e) {
        if (mounted)
            ScaffoldMessenger.of(
                context,
            ).showSnackBar(SnackBar(content: Text('Erro: $e')));
    } finally {
        if (mounted) setState(() => _isLoading = false);
    }
}

void _fitMapToRoute() {
    if (_pickupLocation == null || _dropoffLocation == null) return;
    final validPoints = [_pickupLocation!, _dropoffLocation!, ..._routePoints];
    try {
      final bounds = LatLngBounds.fromPoints(validPoints);
        _mapController.fitCamera(
            CameraFit.bounds(
                bounds: bounds,
                padding: const EdgeInsets.only(
                    top: 100,
                    left: 50,
                    right: 50,
                    bottom: 300,
                ),
        ),
      );
    } catch (_) {
        _mapController.move(_dropoffLocation!, 14);
    }
}

  double _extractFareValue(dynamic data) {
    if (data == null) return 0.0;
    if (data is num) return data.toDouble();
    if (data is Map) {
      final value = data['estimated'] ?? data['fare'] ?? data['total'] ?? 0;
        return double.tryParse(value.toString()) ?? 0.0;
    }
    return 0.0;
}

Future < void> _requestRide() async {
    if (_pickupLocation == null || _dropoffLocation == null) return;
    setState(() => _isLoading = true);
    try {
      final trip = await _uberService.requestTrip(
        pickupLat: _pickupLocation!.latitude,
        pickupLng: _pickupLocation!.longitude,
        pickupAddress: _pickupController.text,
        dropoffLat: _dropoffLocation!.latitude,
        dropoffLng: _dropoffLocation!.longitude,
        dropoffAddress: _dropoffController.text,
        vehicleTypeId: _selectedVehicleId,
        fare: _extractFareValue(_fareEstimate),
        paymentMethod: _selectedPaymentMethod,
    );
        if (mounted) context.go('/uber-tracking/${trip['trip_id']}');
    } catch (e) {
        if (mounted)
            ScaffoldMessenger.of(
                context,
            ).showSnackBar(SnackBar(content: Text('Erro ao solicitar: $e')));
    } finally {
        if (mounted) setState(() => _isLoading = false);
    }
}

void _startWatchingOnlineDrivers() {
    _onlineDriversSubscription = _uberService.watchAllOnlineDrivers().listen((
        drivers,
    ) {
        if (mounted) {
            setState(() {
                _onlineDrivers = drivers;
            });
            _fetchMissingVehicleTypes();
        }
    });
}

Future < void> _fetchMissingVehicleTypes() async {
    for (final driver in _onlineDrivers) {
      final driverId = driver['driver_id'] as int;
        if (!_driverVehicleTypes.containsKey(driverId)) {
        final typeId = await _uberService.getDriverVehicleTypeId(driverId);
            if (mounted && typeId != null)
                setState(() => _driverVehicleTypes[driverId] = typeId);
        }
    }
}

@override
void dispose() {
    _onlineDriversSubscription?.cancel();
    _debouncer?.cancel();
    _pickupController.dispose();
    _dropoffController.dispose();
    _pickupFocus.dispose();
    _dropoffFocus.dispose();
    WidgetsBinding.instance.addPostFrameCallback((_) {
        ThemeService().setNavBarVisible(true);
    });
    super.dispose();
}

@override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
        body: Stack(
            children: [
            Positioned.fill(
                child: FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                        initialCenter:
                        _pickupLocation ?? const LatLng(-5.5263, -47.4764),
                            initialZoom: 15.0,
                                onTap: _onMapTap,
                                    onPositionChanged: (pos, hasGesture) {
                                        if (_isPickingOnMap && hasGesture) {
                                            _onPickingLocationChanged(pos.center);
                                        }
                                    },
              ),
    children: [
        TileLayer(
            urlTemplate:
            'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${SupabaseConfig.mapboxToken}',
            userAgentPackageName: 'com.play101.app',
            tileSize: 512,
            zoomOffset: -1,
            maxZoom: 22,
        ),
                if (_routePoints.isNotEmpty)
        PolylineLayer(
            polylines: [
            Polyline(
                points: _routePoints,
                strokeWidth: 5,
                color: Colors.blue.withOpacity(0.8),
                borderColor: Colors.blue.shade900,
                borderStrokeWidth: 1,
            ),
        ],
        ),
            MarkerLayer(
                markers: [
                ..._onlineDrivers.map((driver) {
                      final driverId = driver['driver_id'];
                      final isMoto = _driverVehicleTypes[driverId] == 3;
                    return Marker(
                        point: LatLng(
                            double.parse(driver['latitude'].toString()),
                            double.parse(driver['longitude'].toString()),
                        ),
                        width: 60,
                        height: 60,
                        child: Container(
                            padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.91),
                    shape: BoxShape.circle,
                ),
                child: Image.asset(
                    isMoto
                        ? 'assets/icons/034-motorbike.png'
                        : 'assets/icons/036-car.png',
                    width: 40,
                    height: 40,
                ),
                        ),
                      );
}),
if (_pickupLocation != null)
    Marker(
        point: _pickupLocation!,
        width: 40,
        height: 40,
        child: _buildMarker(isPickup: true),
    ),
                    if (_dropoffLocation != null)
    Marker(
        point: _dropoffLocation!,
        width: 40,
        height: 40,
        child: _buildMarker(isPickup: false),
    ),
                  ],
                ),
if (_isPickingOnMap)
    Center(
        child: Padding(
            padding: const EdgeInsets.only(bottom: 48),
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                    TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0.0, end: 1.0),
                        duration: const Duration(milliseconds: 600),
                            curve: Curves.easeInOut,
                                builder: (context, value, child) {
                                    return Transform.translate(
                                        offset: Offset(
                                            0,
                                            -10 * (1 - (value - 0.5).abs() * 2),
                                        ),
                                        child: child,
                                    );
                                },
                                    onEnd: () => setState(
                                        () { },
                                    ),
                                        child: Container(
                                            padding: const EdgeInsets.all(12),
                                                decoration: const BoxDecoration(
                                                    color: Color(0xFF427CF0),
                                                        shape: BoxShape.circle,
                                                            boxShadow: [
                                                                BoxShadow(
                                                                    color: Colors.black26,
                                                                    blurRadius: 20,
                                                                    offset: Offset(0, 10),
                                                                ),
                                                            ],
                              ),
child: const Icon(
    Icons.location_on,
    color: Colors.white,
        size: 32,
                              ),
                            ),
                          ),
const SizedBox(height: 4),
    Container(
        width: 10,
        height: 4,
        decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.1),
            borderRadius: BorderRadius.circular(5),
        ),
    ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
// Address Selection UI (Full Screen Overlay)
if (!_isPickingOnMap && _dropoffLocation == null)
    Positioned.fill(
        child: Container(
            color: const Color(
                0xFFF6F6F8,
                ).withOpacity(0.9),
                child: SafeArea(
                    child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                // Header
                                Padding(
                                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                                        child: Row(
                                            children: [
                                            _buildFloatingCircleButton(
                                                icon: Icons.arrow_back,
                                                onPressed: () => context.pop(),
                                            ),
                              const SizedBox(width: 16),
                              const Text(
    'Para onde vamos ?',
    style: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        color: Color(0xFF101622),
        letterSpacing: -0.5,
    ),
                              ),
                            ],
                          ),
                        ),
// Search Card
Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Container(
            padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                    BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                                ),
                              ],
                            ),
child: Row(
    children: [
    Column(
        children: [
                                    const SizedBox(height: 12),
    Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
            color: Colors.grey.shade300,
            shape: BoxShape.circle,
        ),
    ),
    Container(
        width: 1.5,
        height: 24,
        color: Colors.grey.shade100,
    ),
    Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
            color: AppTheme.primaryYellow,
            shape: BoxShape.rectangle,
        ),
    ),
                                    const SizedBox(height: 12),
                                  ],
                                ),
const SizedBox(width: 16),
    Expanded(
        child: Column(
            children: [
            Container(
                decoration: BoxDecoration(
                    color: const Color(0xFFF1F4F9),
                        borderRadius: BorderRadius.circular(
                            12,
                        ),
                                        ),
child: TextField(
    controller: _pickupController,
    readOnly: true,
    style: TextStyle(
        color: Colors.grey.shade500,
        fontSize: 14,
        fontWeight: FontWeight.w500,
    ),
    decoration: const InputDecoration(
        hintText: 'Localização atual',
        border: InputBorder.none,
        contentPadding:
            EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
            ),
                                          ),
                                        ),
                                      ),
const SizedBox(height: 12),
    Container(
        decoration: BoxDecoration(
            color: const Color(0xFFF1F4F9),
                borderRadius: BorderRadius.circular(
                    12,
                ),
                    border: Border.all(
                        color: _dropoffFocus.hasFocus
                        ? AppTheme.primaryYellow
                        : Colors.transparent,
                        width: 2,
                    ),
                                        ),
child: Row(
    children: [
    Expanded(
        child: TextField(
            controller: _dropoffController,
            focusNode: _dropoffFocus,
            autofocus: true,
            onTap: () {
                setState(
                    () => _selectingPickup =
                        false,
                );
                _onSearchQueryChanged('');
            },
            onChanged:
            _onSearchQueryChanged,
            style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 16,
                color: Color(0xFF101622),
                                                ),
decoration:
const InputDecoration(
    hintText:
        'Para onde Vamos ?',
    hintStyle: TextStyle(
        fontWeight:
            FontWeight.w400,
    ),
        border: InputBorder.none,
            contentPadding:
EdgeInsets.symmetric(
    horizontal: 12,
    vertical: 12,
),
                                                ),
                                              ),
                                            ),
if (_dropoffController
    .text
    .isNotEmpty)
    IconButton(
        icon: Container(
            padding: const EdgeInsets.all(
                2,
                                                  ),
                decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    shape: BoxShape.circle,
                ),
                    child: const Icon(
                        Icons.close,
                        size: 14,
                            color: Colors.white,
                                                  ),
                                                ),
onPressed: () {
    _dropoffController.clear();
    _onSearchQueryChanged('');
},
                                              ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
const SizedBox(height: 24),
    // Set location on map button
    Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
                'SUGESTÕES',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Colors.grey.shade400,
                    letterSpacing: 0.5,
                ),
            ),
                        ),
const SizedBox(height: 12),
                        // Results List
                        if (_isSearchingLocation)
    const Center(
        child: Padding(
            padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
                            ),
                          )
                        else if (_searchResults.isNotEmpty)
    Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 15,
                    offset: const Offset(0, 6),
                                ),
                              ],
                            ),
child: Column(
    mainAxisSize: MainAxisSize.min,
    children: [
    ListView.separated(
        padding: EdgeInsets.zero,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
            itemCount: _searchResults.length,
                separatorBuilder: (_, __) => Divider(
                    height: 1,
                    thickness: 1,
                    color: Colors.grey.shade200,
                    indent: 70,
                    endIndent: 16,
                ),
                    itemBuilder: (context, index) {
                                    final item = _searchResults[index];
                        return ListTile(
                            contentPadding:
                                          const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                            ),
                            leading: Container(
                                padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                        color: _getCategoryColor(
                                            item['category']?.toString(),
                                        ),
                                        shape: BoxShape.circle,
                                    ),
                                        child: Icon(
                                            _getCategoryIcon(
                                                item['category']?.toString(),
                                            ),
                                            color: Colors.white,
                                            size: 22,
                                        ),
                                      ),
                        title: Text(
                            item['main_text'] ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                color: Color(0xFF101622),
                                        ),
                                      ),
                        subtitle: Column(
                            crossAxisAlignment:
                            CrossAxisAlignment.start,
                            children: [
                            Text(
                                item['secondary_text'] ?? '',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    color: Colors.grey.shade500,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    height: 1.2,
                                ),
                            ),
                                          const SizedBox(height: 6),
                            Row(
                                children: [
                                              if (item['bairro'] != null &&
                            item['bairro']
                                .toString()
                                .isNotEmpty)
                            Container(
                                margin: const EdgeInsets.only(
                                    right: 8,
                                ),
                                    padding:
                        const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                        ),
                            decoration: BoxDecoration(
                                color: const Color(
                                    0xFFF1F4F9,
                                                    ),
                                    borderRadius:
                        BorderRadius.circular(
                            4,
                        ),
                                                  ),
                        child: Text(
                            item['bairro']
                                .toString()
                                .toUpperCase(),
                            style: TextStyle(
                                fontSize: 9,
                                fontWeight:
                                FontWeight.w900,
                                color:
                                Colors.grey.shade700,
                            ),
                        ),
                                                ),
                        Text(
                            '${item['time_text']} • ${item['dist_text']}',
                            style: TextStyle(
                                color: const Color(
                                    0xFF427CF0,
                                                  ).withOpacity(0.8),
                                    fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                        onTap: () => _selectSearchResult(item),
                                    );
                    },
                                ),
Divider(
    height: 1,
    thickness: 1,
    color: Colors.grey.shade200,
    indent: 70,
    endIndent: 16,
),
    ListTile(
        contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 8,
        ),
            leading: Container(
                padding: const EdgeInsets.all(10),
                    decoration: const BoxDecoration(
                        color: Color(0xFFFFFAEA),
                            shape: BoxShape.circle,
                                    ),
child: Icon(
    LucideIcons.map,
    color: AppTheme.primaryYellow,
    size: 22,
),
                                  ),
title: const Text(
    'Definir no mapa',
    style: TextStyle(
        fontWeight: FontWeight.w800,
        fontSize: 15,
        color: Color(0xFF101622),
    ),
                                  ),
subtitle: Text(
    'Arraste para escolher o local exato',
    style: TextStyle(
        color: Colors.grey.shade500,
        fontSize: 13,
        fontWeight: FontWeight.w500,
    ),
),
    trailing: Icon(
        Icons.chevron_right,
        color: Colors.grey.shade400,
        size: 20,
    ),
        onTap: () {
            setState(() {
                _isPickingOnMap = true;
                _searchResults = [];
            });
        },
                                ),
                              ],
                            ),
                          ),
const SizedBox(height: 24),
    // Mini Map Preview Footer (Live background logic)
    Padding(
        padding: const EdgeInsets.only(bottom: 24),
            child: Center(
                child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                    ),
                        decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(30),
                            boxShadow: [
                            BoxShadow(
                                color: Colors.black.withOpacity(0.08),
                                blurRadius: 20,
                                offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
child: Row(
    mainAxisSize: MainAxisSize.min,
    children: [
    Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
            color: AppTheme.primaryYellow,
            shape: BoxShape.circle,
        ),
    ),
                                  const SizedBox(width: 10),
                                  const Text(
    'Buscando rotas...',
    style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w800,
        color: Color(0xFF101622),
    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ),
            ),
// New Picking Mode Top Bar
if (_isPickingOnMap)
    Positioned(
        top: MediaQuery.of(context).padding.top + 8,
        left: 16,
        right: 16,
        child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
            _buildFloatingCircleButton(
                icon: Icons.arrow_back,
                onPressed: () => setState(() => _isPickingOnMap = false),
            ),
                  const Text(
    'Definir destino',
    style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
    ),
                  ),
_buildFloatingCircleButton(
    icon: Icons.help_outline,
    onPressed: () { },
),
                ],
              ),
            ),
// Ride Mode Back Button (Corrected)
if (_dropoffLocation != null && !_isPickingOnMap)
    Positioned(
        top: MediaQuery.of(context).padding.top + 8,
        left: 16,
        child: _buildFloatingCircleButton(
            icon: Icons.arrow_back,
            onPressed: () {
                setState(() {
                    _dropoffLocation = null;
                    _fareEstimate = null;
                    _isPickingOnMap = false;
                });
            },
        ),
    ),
          // Map Controls (Right Side)
          if (_isPickingOnMap || (_dropoffLocation != null && !_isPickingOnMap))
    Positioned(
        right: 16,
        top: MediaQuery.of(context).size.height * 0.4,
        child: Column(
            children: [
            _buildMapControlButton(
                icon: Icons.add,
                onPressed: () => _mapController.move(
                    _mapController.camera.center,
                    _mapController.camera.zoom + 1,
                ),
            ),
                  const SizedBox(height: 8),
    _buildMapControlButton(
        icon: Icons.remove,
        onPressed: () => _mapController.move(
            _mapController.camera.center,
            _mapController.camera.zoom - 1,
        ),
    ),
                  const SizedBox(height: 16),
    _buildMapControlButton(
        icon: Icons.my_location,
        color: const Color(0xFF427CF0),
            onPressed: _getCurrentLocation,
                  ),
                ],
              ),
            ),
// Redesigned Bottom Sheet (Picking Mode)
if (_isPickingOnMap)
    Align(
        alignment: Alignment.bottomCenter,
        child: Container(
            width: double.infinity,
            decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                        topRight: Radius.circular(24),
                  ),
boxShadow: [
    BoxShadow(
        color: Colors.black12,
        blurRadius: 40,
        offset: Offset(0, -10),
    ),
],
                ),
child: Column(
    mainAxisSize: MainAxisSize.min,
    children: [
    // Drag Handle
    Container(
        margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40,
                height: 5,
                    decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(10),
                    ),
                    ),
Padding(
    padding: const EdgeInsets.only(
        left: 24,
        right: 24,
        bottom: 32,
    ),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
            // Styled Search Bar inside card
            Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(16),
                    ),
                        child: Row(
                            children: [
                                const Icon(
    Icons.search,
    color: Color(0xFF427CF0),
        size: 20,
                                ),
const SizedBox(width: 12),
    Expanded(
        child: TextField(
            controller: _selectingPickup
            ? _pickupController
            : _dropoffController,
            readOnly: true,
            style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 15,
            ),
                decoration: const InputDecoration(
                    border: InputBorder.none,
                    hintText: 'Buscar endereço...',
                ),
                                  ),
                                ),
                              ],
                            ),
                          ),
const SizedBox(height: 16),
    // Selected Location Info Card
    Container(
        padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: const Color(0xFF427CF0).withOpacity(0.05),
                    borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: const Color(0xFF427CF0).withOpacity(0.1),
                              ),
                            ),
child: Row(
    children: [
    Container(
        padding: const EdgeInsets.all(10),
            decoration: const BoxDecoration(
                color: Color(0xFF427CF0),
                    shape: BoxShape.circle,
                                  ),
child: const Icon(
    Icons.map,
    color: Colors.white,
        size: 20,
                                  ),
                                ),
const SizedBox(width: 16),
    Expanded(
        child: Column(
            crossAxisAlignment:
            CrossAxisAlignment.start,
            children: [
            Text(
                _selectingPickup
                    ? 'Local de partida'
                    : 'Destino',
                style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                ),
                                      ),
Text(
    _selectingPickup
        ? _pickupController.text
        : _dropoffController.text,
    maxLines: 1,
    overflow: TextOverflow.ellipsis,
    style: TextStyle(
        color: Colors.grey.shade500,
        fontSize: 13,
    ),
),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
const SizedBox(height: 24),
    // Confirm Button
    SizedBox(
        width: double.infinity,
        child: ElevatedButton(
            onPressed: () {
                setState(() {
                    _dropoffLocation =
                        _mapController.camera.center;
                    _isPickingOnMap = false;
                    _searchResults = [];
                });
                _calculateFare();
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryYellow,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.all(18),
                    elevation: 4,
                        shadowColor: AppTheme.primaryYellow.withOpacity(
                            0.4,
                        ),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                            ),
                                textStyle: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                ),
                              ),
child: const Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
        Text('Confirmar destino'),
        SizedBox(width: 8),
        Icon(Icons.arrow_forward, size: 20),
                                ],
                              ),
                            ),
                          ),
const SizedBox(height: 12),
    Center(
        child: TextButton(
            onPressed: () { },
            child: Text(
                'Escolher dos favoritos',
                style: TextStyle(
                    color: Colors.grey.shade500,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                ),
            ),
        ),
    ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
// Vehicle Selection (Ride Mode)
if (_dropoffLocation != null &&
    !_isPickingOnMap &&
    _searchResults.isEmpty)
    Align(
        alignment: Alignment.bottomCenter,
        child: Container(
            padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(32),
                            topRight: Radius.circular(32),
                  ),
boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
                ),
child: Column(
    mainAxisSize: MainAxisSize.min,
    children: [
                    if (_fareEstimate != null) ...[
    Row(
        children: [
        Expanded(
            child: _buildVehicleCard(predefinedVehicles[0]),
        ),
                          const SizedBox(width: 16),
    Expanded(
        child: _buildVehicleCard(predefinedVehicles[1]),
    ),
                        ],
                      ),
const SizedBox(height: 16),
    ListTile(
        leading: Icon(
            _selectedPaymentMethod == 'PIX'
                ? Icons.pix
                : Icons.money,
            color: AppTheme.primaryYellow,
        ),
        title: Text('Pagamento: $_selectedPaymentMethod'),
        trailing: Text(
            'ALTERAR',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryYellow,
            ),
        ),
        onTap: _showPaymentSelection,
    ),
                      const SizedBox(height: 16),
    SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton(
            onPressed: _isLoading ? null : _requestRide,
            style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryYellow,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                ),
            ),
            child: _isLoading
            ? const CircularProgressIndicator()
                : const Text(
                    'SOLICITAR AGORA',
                    style: TextStyle(
                        color: AppTheme.textDark,
                        fontWeight: FontWeight.bold,
                    ),
                                ),
                        ),
                      ),
                    ] else
const Padding(
    padding: EdgeInsets.all(32),
        child: CircularProgressIndicator(),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

void _showPaymentSelection() {
    showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    builder: (context) {
        return Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
              const Text(
            'Forma de Pagamento',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
        const SizedBox(height: 16),
            ListTile(
                leading: const Icon(Icons.pix, color: Colors.teal),
        title: const Text('PIX'),
            trailing: _selectedPaymentMethod == 'PIX'
                ? const Icon(Icons.check, color: Colors.green)
                    : null,
            onTap: () {
                setState(() => _selectedPaymentMethod = 'PIX');
                Navigator.pop(context);
            },
              ),
        ListTile(
            leading: const Icon(Icons.money, color: Colors.green),
        title: const Text('Dinheiro'),
            trailing: _selectedPaymentMethod == 'Dinheiro'
                ? const Icon(Icons.check, color: Colors.green)
                    : null,
            onTap: () {
                setState(() => _selectedPaymentMethod = 'Dinheiro');
                Navigator.pop(context);
            },
              ),
        ListTile(
            leading: const Icon(Icons.credit_card, color: Colors.blue),
        title: const Text('Cartão (Máquina)'),
            trailing: _selectedPaymentMethod == 'Cartão'
                ? const Icon(Icons.check, color: Colors.green)
                    : null,
            onTap: () {
                setState(() => _selectedPaymentMethod = 'Cartão');
                Navigator.pop(context);
            },
              ),
            ],
          ),
        );
    },
    );
}

  Widget _buildVehicleCard(Map < String, dynamic > v) {
    bool isSelected = _selectedVehicleId == v['id'];
    String timeTxt = _routeDuration != null
        ? '${_routeDuration!.toStringAsFixed(0)} min'
        : '-- min';
    String distTxt = _routeDistance != null
        ? '${_routeDistance!.toStringAsFixed(1)} km'
        : '-- km';
    return GestureDetector(
        onTap: () => setState(() => _selectedVehicleId = v['id']),
        child: Container(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: isSelected ? AppTheme.primaryYellow : Colors.grey.shade100,
                        width: 2.5,
                    ),
                    boxShadow: isSelected
                    ? [
                        BoxShadow(
                            color: AppTheme.primaryYellow.withOpacity(0.1),
                            blurRadius: 15,
                            offset: const Offset(0, 8),
                  ),
                ]
              : [],
        ),
    child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
        Image.asset(v['asset'], height: 44),
            const SizedBox(height: 12),
        Text(
            v['name'],
            style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 15,
                color: Color(0xFF101622),
              ),
            ),
    const SizedBox(height: 2),
        Text(
            '$timeTxt • $distTxt',
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade500,
            ),
        ),
            const SizedBox(height: 12),
        Text(
            'R\$ ${_extractFareValue(_fareEstimate).toStringAsFixed(2)}',
            style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Color(0xFF427CF0),
                    letterSpacing: -0.5,
              ),
            ),
          ],
        ),
      ),
    );
}

  Widget _buildMarker({ required bool isPickup }) {
    return Container(
        decoration: BoxDecoration(
            color: isPickup ? Colors.blue : Colors.orange,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
        ),
        child: const Center(
            child: Icon(Icons.location_on, color: Colors.white, size: 20),
      ),
    );
}

  Widget _buildFloatingCircleButton({
    required IconData icon,
    required VoidCallback onPressed,
}) {
    return Container(
        decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 10,
                offset: const Offset(0, 4),
          ),
        ],
      ),
    child: IconButton(
        icon: Icon(icon, color: Colors.black, size: 22),
        onPressed: onPressed,
    ),
    );
}

  Widget _buildMapControlButton({
    required IconData icon,
    required VoidCallback onPressed,
    Color? color,
}) {
    return Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 10,
                offset: const Offset(0, 4),
          ),
        ],
      ),
    child: IconButton(
        icon: Icon(icon, color: color ?? Colors.black87, size: 20),
        onPressed: onPressed,
    ),
    );
}
}