import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'realtime_service.dart';
import 'mock_api_service.dart';

class ApiService {
  static const String _androidEmulatorApiUrl = 'http://10.0.2.2:4012/api';
  static const String _iosRealDeviceApiUrl = 'http://localhost:4012/api';

  static const String _prodApiUrl = 'http://localhost:4012/api'; // Demo environment

  static bool isDemoMode = true;

  static String? _overrideBaseUrl;

  static String get baseUrl {
    if (_overrideBaseUrl != null) return _overrideBaseUrl!;

    if (kDebugMode) {
      if (defaultTargetPlatform == TargetPlatform.android) {
        return _androidEmulatorApiUrl;
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        return _iosRealDeviceApiUrl;
      }
    }
    // Default to Emulator for Demo execution usually
    return _androidEmulatorApiUrl;
  }

  static String fixUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.contains('localhost') &&
        !kIsWeb &&
        defaultTargetPlatform == TargetPlatform.android) {
      return url.replaceAll('localhost', '10.0.2.2');
    }
    return url;
  }

  String? _token;
  String? _role;
  bool _isMedical = false;
  bool _isFixedLocation = false;
  final _secureStorage = const FlutterSecureStorage();
  final String _tokenKey = 'auth_token';

  // Cache for media bytes
  final Map<String, Future<Uint8List>> _mediaBytesCache = {};

  bool get isMedical => _isMedical;
  bool get isFixedLocation => _isFixedLocation;
  String? get role => _role;

  http.Client _client = http.Client();

  /// Sets a custom HTTP client (useful for testing)
  void setClient(http.Client client) {
    _client = client;
  }

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal() {
    // Keep token fresh automatically
    FirebaseAuth.instance.idTokenChanges().listen((User? user) async {
      if (user != null) {
        try {
          _token = await user.getIdToken();
          debugPrint('ApiService: Token refreshed via listener');
        } catch (e) {
          debugPrint('ApiService: Error refreshing token: $e');
        }
      } else {
        _token = null;
      }
    });
  }

  Future<String?> _getToken() async {
    // Return cached token if available
    if (_token != null) return _token;

    try {
      debugPrint('ApiService: Getting token (cache miss)...');
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        // Force refresh to ensure valid token if needed, or just get current
        final token = await user.getIdToken();
        _token = token;
        // Optionally persist to secure storage only if needed for offline access
        // await _secureStorage.write(key: _tokenKey, value: token);
        return token;
      }
    } catch (e) {
      debugPrint('Error fetching Firebase ID token: $e');
    }

    // Fallback: try reading from secure storage if not in memory
    // But usually FirebaseAuth.currentUser is enough
    _token ??= await _secureStorage.read(key: _tokenKey);
    return _token;
  }



  // --- Appointments / Scheduling ---

  Future<List<Map<String, dynamic>>> getProviderSlots(
    int providerId, {
    String? date,
  }) async {
    final token = await _getToken();
    final uri = Uri.parse(
      '$baseUrl/appointments/$providerId/slots',
    ).replace(queryParameters: date != null ? {'date': date} : null);

    final response = await _client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      return List<Map<String, dynamic>>.from(jsonDecode(response.body));
    }
    throw Exception('Failed to load slots: ${response.statusCode}');
  }

  Future<void> markSlotBusy(DateTime startTime) async {
    final token = await _getToken();
    final response = await _client.post(
      Uri.parse('$baseUrl/appointments/busy'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'start_time': startTime.toIso8601String()}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to mark slot busy');
    }
  }

  Future<void> bookSlot(int providerId, DateTime startTime) async {
    final token = await _getToken();
    final response = await _client.post(
      Uri.parse('$baseUrl/appointments/book'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'provider_id': providerId,
        'start_time': startTime.toIso8601String(),
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to book slot');
    }
  }

  Future<void> deleteAppointment(int appointmentId) async {
    final token = await _getToken();
    final response = await _client.delete(
      Uri.parse('$baseUrl/appointments/$appointmentId'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to delete appointment');
    }
  }

  Future<List<Map<String, dynamic>>> getScheduleConfig() async {
    final token = await _getToken();
    final response = await _client.get(
      Uri.parse('$baseUrl/appointments/config'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      return List<Map<String, dynamic>>.from(jsonDecode(response.body));
    }
    throw Exception('Failed to load config');
  }

  Future<void> saveScheduleConfig(List<Map<String, dynamic>> configs) async {
    final token = await _getToken();
    final response = await _client.post(
      Uri.parse('$baseUrl/appointments/config'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(configs),
    );

    if (response.statusCode != 200) {
      debugPrint('Failed to save config: ${response.body}');
      throw Exception('Failed to save config: ${response.body}');
    }
  }

  Future<List<Map<String, dynamic>>> getScheduleExceptions() async {
    final token = await _getToken();
    final response = await _client.get(
      Uri.parse('$baseUrl/provider/schedule/exceptions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return List<Map<String, dynamic>>.from(decoded['exceptions'] ?? decoded);
    }
    return [];
  }

  Future<void> saveScheduleExceptions(List<dynamic> exceptions) async {
    final token = await _getToken();
    final response = await _client.post(
      Uri.parse('$baseUrl/provider/schedule/exceptions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'exceptions': exceptions}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to save exceptions');
    }
  }

  Future<void> autoDetectBaseUrl() async {
    // FORCE PRODUCTION URL FOR DEBUG APK AS REQUESTED
    /*
    debugPrint(
      'API Service: Auto-detect disabled. Using production URL: https://cardapyia.com/api',
    );
    return;
    */

    /*
    if (kIsWeb) return; // No auto-detect for web
    if (_overrideBaseUrl != null) return;

    final candidates = [
      'http://10.0.2.2:4011/api', // Android Emulator
      'http://localhost:4011/api', // iOS Simulator / ADB reverse
      // 'http://192.168.1.4:4011/api', // IP da máquina local (detectado)
      // 'http://192.168.1.X:4011/api', // Caso o IP mude, ajuste aqui
    ];

    debugPrint('API Service: Auto-detecting base URL...');

    for (final url in candidates) {
      try {
        debugPrint('API Service: Testing $url...');
        final res = await _client
            .get(Uri.parse(url))
            .timeout(const Duration(seconds: 2));

        // Se receber qualquer resposta (mesmo erro de auth/404), o servidor está lá
        if (res.statusCode < 503) {
          debugPrint('API Service: Found active server at $url');
          await setBaseUrl(url);
          return;
        }
      } catch (_) {
        // Ignora erros de conexão/timeout e tenta o próximo
      }
    }

    debugPrint('API Service: No local server found, keeping default.');
    */
  }

  Future<void> setBaseUrl(String url) async {
    _overrideBaseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_base_url', url);
  }

  String? get currentToken => _token;

  Future<void> loadConfig() async {
    // FORCE VERCEL URL - Ignore stored local IP
    /*
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString('api_base_url');
    if (url != null) {
      _overrideBaseUrl = url;
    }
    */
    _overrideBaseUrl = null; // Ensure we use the default env URL
  }

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = await _secureStorage.read(key: _tokenKey);
    _role = prefs.getString('user_role');
    _isMedical = prefs.getBool('is_medical') ?? false;
    _isFixedLocation = prefs.getBool('is_fixed_location') ?? false;
  }

  // Fuel price cache
  final Map<String, _FuelCacheItem> _fuelCache = {};
  static const Duration _fuelCacheTTL = Duration(hours: 6);

  Future<Map<String, dynamic>> _getCachedFuel(String key, Future<Map<String, dynamic>> Function() fetcher) async {
    final now = DateTime.now();
    if (_fuelCache.containsKey(key)) {
      final item = _fuelCache[key]!;
      if (now.isBefore(item.expiry)) {
        return item.data;
      }
    }
    final data = await fetcher();
    if (data.isNotEmpty) {
      _fuelCache[key] = _FuelCacheItem(data: data, expiry: now.add(_fuelCacheTTL));
    }
    return data;
  }

  Future<void> saveToken(String token) async {
    _token = token;
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  Future<void> clearToken() async {
    _token = null;
    try {
      await FirebaseAuth.instance.signOut();
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.delete(key: _tokenKey);
    await prefs.remove('user_id');
    await prefs.remove('user_role');
    await prefs.remove('is_medical');
    await prefs.remove('is_fixed_location');
  }

  void dispose() {
    _client.close();
  }

  bool get isLoggedIn =>
      _token != null || FirebaseAuth.instance.currentUser != null;

  Map<String, String> get authHeaders => _headers;

  Map<String, String> get _headers {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> post(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    try {
      // Ensure token is fresh before request
      await _getToken();

      final response = await _client
          .post(
            Uri.parse('$baseUrl$endpoint'),
            headers: _headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 60));
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        message: 'Servidor demorou a responder',
        statusCode: 408,
      );
    }
  }

  Future<Map<String, dynamic>> put(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    try {
      // Ensure token is fresh before request
      await _getToken();

      final response = await _client
          .put(
            Uri.parse('$baseUrl$endpoint'),
            headers: _headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        message: 'Servidor demorou a responder',
        statusCode: 408,
      );
    }
  }

  Future<Map<String, dynamic>> get(String endpoint) async {
    try {
      // Ensure token is fresh before request
      await _getToken();

      final response = await _client
          .get(Uri.parse('$baseUrl$endpoint'), headers: _headers)
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        message: 'Servidor demorou a responder',
        statusCode: 408,
      );
    }
  }

  Future<Map<String, dynamic>> delete(String endpoint) async {
    try {
      // Ensure token is fresh before request
      await _getToken();

      final response = await _client
          .delete(Uri.parse('$baseUrl$endpoint'), headers: _headers)
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        message: 'Servidor demorou a responder',
        statusCode: 408,
      );
    }
  }

  Future<http.Response> getRaw(
    String endpoint, {
    Map<String, String>? extraHeaders,
  }) async {
    final headers = {..._headers, if (extraHeaders != null) ...extraHeaders};
    return await http.get(Uri.parse('$baseUrl$endpoint'), headers: headers);
  }

  // --- Media & Storage ---

  Future<String> _uploadToFirebase(
    String folder,
    List<int> bytes,
    String filename,
  ) async {
    final ref = FirebaseStorage.instance.ref().child(
      '$folder/${DateTime.now().millisecondsSinceEpoch}_$filename',
    );
    final uploadTask = ref.putData(Uint8List.fromList(bytes));
    final snapshot = await uploadTask;
    return await snapshot.ref.getDownloadURL();
  }

  // Duplicate methods removed to fix conflict
  // uploadServiceImage, uploadServiceVideo, uploadServiceAudio are defined with more options below

  Future<void> registerDeviceToken(String token, String platform) async {
    try {
      await post('/notifications/register-token', {
        'token': token,
        'platform': platform,
      });
    } catch (e) {
      debugPrint('Error registering device token: $e');
      // Don't rethrow, as this is a background task
    }
  }

  Future<String> uploadChatMedia(
    String serviceId,
    List<int> bytes,
    String type,
  ) async {
    final ext = type == 'video' ? 'mp4' : (type == 'audio' ? 'm4a' : 'jpg');
    return _uploadToFirebase('chat/$serviceId', bytes, 'media.$ext');
  }

  Future<void> uploadContestEvidence(
    String serviceId, {
    required String type, // 'photo', 'video', 'audio'
    required List<int> fileBytes,
    required String filename,
    required String mimeType,
  }) async {
    final url = await _uploadToFirebase(
      'contests/$serviceId',
      fileBytes,
      filename,
    );

    // Link evidence to service contest in MySQL
    await post('/services/$serviceId/contest/evidence', {
      'type': type,
      'url': url, // Backend now expects 'url' instead of 'key'
    });
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(response.body);
    } catch (e) {
      final bodyPrefix = response.body.length > 500 ? response.body.substring(0, 500) : response.body;
      debugPrint(
        '[IMPORTANT] ERRO DECODE JSON (Status ${response.statusCode}): $bodyPrefix',
      );
      throw ApiException(
        message: 'Resposta inválida do servidor (Status ${response.statusCode})',
        statusCode: response.statusCode,
      );
    }

    Map<String, dynamic> data;

    if (decoded is Map<String, dynamic>) {
      data = decoded;
    } else {
      data = <String, dynamic>{'raw': decoded};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    }

    if (response.statusCode == 401) {
      unawaited(clearToken());
    }

    final msg =
        (data['message'] ?? data['error'] ?? 'Erro ${response.statusCode}')
            .toString();
    throw ApiException(message: msg, statusCode: response.statusCode);
  }

  // Removed manual check helpers as logic moved to backend


  // ========== AUTH ==========
  Future<Map<String, dynamic>> register({
    required String token, // Firebase ID Token
    required String name,
    required String email,
    String? phone,
    String role = 'client',
    String? documentType,
    String? documentValue,
    String? commercialName,
    String? address,
    double? latitude,
    double? longitude,
    List<dynamic>? professions,
  }) async {
    // Clean professions if needed
    List<dynamic>? cleaned;
    if (professions != null) {
      cleaned = professions.map((p) {
        if (p is Map) return {'id': p['id'], 'name': p['name']};
        return p;
      }).toList();
    }

    final body = {
      'token': token,
      'name': name,
      'email': email,
      'role': role,
      if (phone != null) 'phone': phone,
      if (documentType != null) 'document_type': documentType,
      if (documentValue != null) 'document_value': documentValue,
      if (commercialName != null) 'commercial_name': commercialName,
      if (address != null) 'address': address,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (cleaned != null && cleaned.isNotEmpty) 'professions': cleaned,
    };

    final result = await post('/auth/register', body);

    if (result['user'] != null) {
      final prefs = await SharedPreferences.getInstance();
      final user = result['user'] as Map<String, dynamic>;
      await prefs.setInt('user_id', user['id'] as int);
      _role = user['role'].toString();
      await prefs.setString('user_role', _role!);

      _isMedical = user['is_medical'] == true;
      await prefs.setBool('is_medical', _isMedical);
      
      _isFixedLocation = user['is_fixed_location'] == true;
      await prefs.setBool('is_fixed_location', _isFixedLocation);
    }

    return result;
  }

  Future<Map<String, dynamic>> checkUnique({
    String? email,
    String? phone,
    String? document,
  }) async {
    final qp = [
      if (email != null && email.isNotEmpty) 'email=$email',
      if (phone != null && phone.isNotEmpty) 'phone=$phone',
      if (document != null && document.isNotEmpty) 'document=$document',
    ].join('&');
    return await get('/auth/check${qp.isNotEmpty ? '?$qp' : ''}');
  }

  Future<List<dynamic>> getProfessions() async {
    final result = await get('/auth/professions');
    return (result['professions'] as List?) ?? [];
  }

  Future<List<dynamic>> getProfessionTasks(int professionId) async {
    try {
      final result = await get('/services/professions/$professionId/tasks');
      return (result['tasks'] as List?) ?? [];
    } catch (_) {
      return [];
    }
  }

  Future<void> saveProviderSchedule(
    List<Map<String, dynamic>> schedules,
  ) async {
    final t = _token;
    if (t == null) throw Exception('Not authenticated');

    final response = await _client.post(
      Uri.parse('$baseUrl/provider/schedule'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $t',
      },
      body: jsonEncode({'schedules': schedules}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to save schedule: ${response.body}');
    }
  }

  Future<void> saveProviderService(Map<String, dynamic> service) async {
    final t = _token;
    if (t == null) throw Exception('Not authenticated');

    final response = await _client.post(
      Uri.parse('$baseUrl/provider/services'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $t',
      },
      body: jsonEncode(service),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to save service: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> login(String firebaseToken) async {
    // if (isDemoMode) return MockApiService().login(firebaseToken); // Removed for Networked Demo
    final result = await post('/auth/login', {'token': firebaseToken});

    if (result['user'] != null) {
      final prefs = await SharedPreferences.getInstance();
      final user = result['user'] as Map<String, dynamic>;
      await prefs.setInt('user_id', user['id'] as int);
      _role = user['role'].toString();
      await prefs.setString('user_role', _role!);

      _isMedical = user['is_medical'] == true;
      await prefs.setBool('is_medical', _isMedical);

      _isFixedLocation = user['is_fixed_location'] == true;
      await prefs.setBool('is_fixed_location', _isFixedLocation);
    }

    return result;
  }

  Future<Map<String, dynamic>> getProfile() async {
    // if (isDemoMode) return MockApiService().getProfile(); // Removed for Networked Demo
    return await get('/profile/me');
  }

  Future<void> loginWithFirebase(
    String idToken, {
    String? role,
    String? phone,
    String? name,
    Map<String, dynamic>? humanMetrics,
  }) async {
    final response = await post('/auth/login', {
      'token': idToken,
      if (role != null) 'role': role,
      if (phone != null) 'phone': phone,
      if (name != null) 'name': name,
      if (humanMetrics != null) 'human_metrics': humanMetrics,
    });

    if (response['success'] == true && response['user'] != null) {
      _role = response['user']['role'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_role', _role!);
      await prefs.setInt('user_id', response['user']['id']);
      _isMedical = response['user']['is_medical'] == true;
      await prefs.setBool('is_medical', _isMedical);
      
      _isFixedLocation = response['user']['is_fixed_location'] == true;
      await prefs.setBool('is_fixed_location', _isFixedLocation);

      // Authenticate Realtime Service immediately
      RealtimeService().authenticate(response['user']['id']);
    }
  }

  Future<void> updateProfile({
    String? name,
    String? email,
    String? phone,
  }) async {
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (email != null) body['email'] = email;
    if (phone != null) body['phone'] = phone;

    if (body.isNotEmpty) {
      await put('/profile/me', body);
    }
  }

  Future<void> updateProviderProfile({
    String? documentType,
    String? documentValue,
    String? commercialName,
    List<String>? professions,
  }) async {
    await put('/profile/provider', {
      'document_type': documentType,
      'document_value': documentValue,
      'commercial_name': commercialName,
      'professions': professions,
    });
  }

  Future<int?> getMyUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('user_id');
  }

  // ========== PROFILE ==========
  Future<Map<String, dynamic>> getMyProfile() async {
    // if (isDemoMode) return (await MockApiService().getProfile())['user']; // Removed for Networked Demo
    final result = await get('/profile/me');
    final user = (result['user'] as Map<String, dynamic>?) ?? {};

    // Update local state based on fresh profile data
    if (user.isNotEmpty) {
      _isMedical = user['is_medical'] == true;
      _isFixedLocation = user['is_fixed_location'] == true;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('is_medical', _isMedical);
      await prefs.setBool('is_fixed_location', _isFixedLocation);
    }

    return user;
  }

  Future<List<String>> getProviderSpecialties() async {
    final result = await get('/profile/specialties');
    return (result['specialties'] as List?)?.map((e) {
          if (e is Map) {
            return e['name']?.toString() ?? '';
          }
          return e.toString();
        }).toList() ??
        [];
  }

  Future<Map<String, dynamic>> getProviderProfile(int providerId) async {
    final result = await get('/providers/$providerId/profile');
    return result['profile'] as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> searchProviders(
      {String? term, double? lat, double? lon}) async {
    final queryParams = <String, String>{};
    if (term != null) queryParams['term'] = term;
    if (lat != null) queryParams['lat'] = lat.toString();
    if (lon != null) queryParams['lon'] = lon.toString();

    final queryString = Uri(queryParameters: queryParams).query;
    final result = await get('/providers/search?$queryString');
    return (result as List?)?.cast<Map<String, dynamic>>() ?? [];
  }

  Future<void> addProviderSpecialty(String name) async {
    await post('/profile/specialties', {'name': name});
  }

  Future<void> removeProviderSpecialty(String name) async {
    await _client
        .delete(
          Uri.parse('$baseUrl/profile/specialties/$name'),
          headers: _headers,
        )
        .timeout(const Duration(seconds: 15))
        .then((res) => _handleResponse(res));
  }

  Future<void> deleteAccount() async {
    await delete('/profile/me');
    await clearToken();
  }

  Future<void> requestWithdrawal(String pixKey, double amount) async {
    // Mock implementation for now
    await Future.delayed(const Duration(seconds: 1));
    debugPrint('Mock Withdrawal Request: PIX=$pixKey, Amount=$amount');
    // In a real implementation, this would be:
    // await post('/wallet/withdraw', {'pix_key': pixKey, 'amount': amount});
  }

  // ========== SERVICES ==========
  Future<Map<String, dynamic>> createService({
    required int categoryId,
    required String description,
    required double latitude,
    required double longitude,
    required String address,
    required double priceEstimated,
    required double priceUpfront,
    List<String> imageKeys = const [],
    String? videoKey,
    List<String> audioKeys = const [],
    String? profession,
    String locationType = 'client',
    int? providerId,
    DateTime? scheduledAt,
    int? taskId,
  }) async {
    if (isDemoMode) {
      return MockApiService().createService({
        'category_id': categoryId,
        'description': description,
        'latitude': latitude,
        'longitude': longitude,
        'address': address,
        'price_estimated': priceEstimated,
        'price_upfront': priceUpfront,
        'location_type': locationType,
        'provider_id': providerId,
        'scheduled_at': scheduledAt?.toIso8601String(),
        'task_id': taskId,
      });
    }
    await loadToken();
    final body = <String, dynamic>{
      'category_id': categoryId,
      'description': description,
      'latitude': double.parse(latitude.toStringAsFixed(8)),
      'longitude': double.parse(longitude.toStringAsFixed(8)),
      'address': address,
      'price_estimated': double.parse(priceEstimated.toStringAsFixed(2)),
      'price_upfront': double.parse(priceUpfront.toStringAsFixed(2)),
      if (imageKeys.isNotEmpty) 'images': imageKeys,
      if (videoKey != null) 'video': videoKey,
      if (audioKeys.isNotEmpty) 'audios': audioKeys,
      if (profession != null) 'profession': profession,
      'location_type': locationType,
      if (providerId != null) 'provider_id': providerId,
      if (scheduledAt != null) 'scheduled_at': scheduledAt.toIso8601String(),
      if (taskId != null) 'task_id': taskId,
    };
    return await post('/services', body);
  }

  Future<List<dynamic>> getMyServices() async {
    if (isDemoMode) return MockApiService().getMyServices();
    final result = await get('/services/my');
    return (result['services'] as List?) ?? [];
  }

  Future<List<dynamic>> getAvailableServices() async {
    final result = await get('/services/available');
    return (result['services'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> getServiceDetails(String serviceId) async {
    if (isDemoMode) return MockApiService().getServiceDetails(serviceId);
    final result = await get('/services/$serviceId');
    final service = result['service'] as Map<String, dynamic>;
    return service;
  }

  Future<void> acceptService(String serviceId) async {
    await post('/services/$serviceId/accept', {});
  }

  Future<void> rejectService(String serviceId) async {
    await post('/services/$serviceId/reject', {});
  }

  Future<void> updateServiceStatus(String serviceId, String status) async {
    if (status == 'in_progress') {
      await startService(serviceId);
    } else if (status == 'completed') {
      await completeService(serviceId);
    }
  }

  Future<void> startService(String serviceId) async {
    await post('/services/$serviceId/start', {});
  }

  Future<void> completeService(
    String serviceId, {
    String? proofCode,
    String? proofPhoto,
    String? proofVideo,
  }) async {
    final body = <String, dynamic>{};
    if (proofCode != null) body['proof_code'] = proofCode;
    if (proofPhoto != null) body['proof_photo'] = proofPhoto;
    if (proofVideo != null) body['proof_video'] = proofVideo;

    await post('/services/$serviceId/complete', body);
  }

  Future<void> submitReview({
    required String serviceId,
    required int rating,
    String? comment,
  }) async {
    final token = await _getToken();
    final response = await _client.post(
      Uri.parse('$baseUrl/services/$serviceId/review'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'rating': rating, 'comment': comment}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to submit review: ${response.statusCode}');
    }
  }

  Future<void> arriveService(String serviceId) async {
    await post('/services/$serviceId/arrive', {});
  }

  Future<void> contestService(String serviceId, String reason) async {
    await post('/services/$serviceId/contest', {'reason': reason});
  }

  Future<void> cancelService(String serviceId) async {
    await post('/services/$serviceId/cancel', {});
  }

  Future<void> requestServiceEdit({
    required String serviceId,
    required String newDescription,
    required double newPrice,
  }) async {
    await post('/services/$serviceId/edit_request', {
      'description': newDescription,
      'price': newPrice,
    });
  }

  Future<Map<String, dynamic>> fetchFuelPricesByState(String state) async {
    return _getCachedFuel('state_$state', () async {
      try {
        return await get('/fuel/price?state=$state');
      } catch (_) {
        return {};
      }
    });
  }

  Future<Map<String, dynamic>> fetchFuelPriceByCityState(
    String city,
    String state,
  ) async {
    return _getCachedFuel('city_${city}_$state', () async {
      try {
        return await get('/fuel/price?city=$city&state=$state');
      } catch (_) {
        return {};
      }
    });
  }

  Future<Map<String, dynamic>> reverseCityStateFromCoords(
    double lat,
    double lon,
  ) async {
    try {
      return await get('/geo/reverse?lat=$lat&lon=$lon');
    } catch (_) {
      return {'city': 'Unknown', 'state': 'XX'};
    }
  }

  Future<String> reverseStateFromCoords(double lat, double lon) async {
    final res = await reverseCityStateFromCoords(lat, lon);
    return (res['state'] ?? '').toString();
  }

  Future<Map<String, dynamic>> getRouteMetrics({
    required double fromLat,
    required double fromLon,
    required double toLat,
    required double toLon,
  }) async {
    try {
      return await post('/geo/route', {
        'from': {'lat': fromLat, 'lon': fromLon},
        'to': {'lat': toLat, 'lon': toLon},
      });
    } catch (_) {
      return {'distance_km': 0.0, 'duration_min': 0.0};
    }
  }

  // ========== MEDIA ==========

  Future<Map<String, dynamic>> uploadMultipart(
    String endpoint,
    String fieldName,
    List<int> fileBytes, {
    String filename = 'file',
    String? mimeType,
    Map<String, String>? extraFields,
    void Function(double)? onProgress,
  }) async {
    final token = await _getToken();
    final uri = Uri.parse('$baseUrl$endpoint');

    final request = http.MultipartRequest('POST', uri);

    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    if (extraFields != null) {
      request.fields.addAll(extraFields);
    }

    final multipartFile = http.MultipartFile.fromBytes(
      fieldName,
      fileBytes,
      filename: filename,
      contentType: mimeType != null ? MediaType.parse(mimeType) : null,
    );

    request.files.add(multipartFile);

    try {
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } catch (e) {
      throw ApiException(message: 'Upload falhou: $e', statusCode: 500);
    }
  }

  Future<String> uploadServiceImage(
    List<int> bytes, {
    String filename = 'image.jpg',
    String mimeType = 'image/jpeg',
  }) async {
    // Large files (> 1MB) go directly to Cloudflare R2
    if (bytes.length > 1 * 1024 * 1024) {
      debugPrint('[IMPORTANT] Large image detected (${bytes.length} bytes), using Cloudflare R2');
      return await uploadToCloud(bytes, filename: filename, type: 'service');
    }

    final resp = await uploadMultipart(
      '/media/service/image',
      'file',
      bytes,
      filename: filename,
      mimeType: mimeType,
    );
    return (resp['key'] ?? '').toString();
  }

  Future<String> uploadServiceVideo(
    List<int> bytes, {
    String filename = 'video.mp4',
    String? mimeType,
    void Function(double)? onProgress,
  }) async {
    // Large files (> 1MB) go directly to Cloudflare R2
    if (bytes.length > 1 * 1024 * 1024) {
      debugPrint('[IMPORTANT] Large video detected (${bytes.length} bytes), using Cloudflare R2');
      return await uploadToCloud(bytes, filename: filename, type: 'service');
    }

    final resp = await uploadMultipart(
      '/media/service/video',
      'file',
      bytes,
      filename: filename,
      mimeType: mimeType ?? 'video/mp4',
      onProgress: onProgress,
    );
    return (resp['key'] ?? '').toString();
  }

  Future<String> uploadServiceVideoFromPath(
    String path, {
    String filename = 'video.mp4',
    String? mimeType,
    void Function(double)? onProgress,
  }) async {
    final bytes = await File(path).readAsBytes();
    return await uploadServiceVideo(
      bytes,
      filename: filename,
      mimeType: mimeType,
      onProgress: onProgress,
    );
  }

  Future<String> uploadToCloud(
    List<int> bytes, {
    required String filename,
    required String type,
  }) async {
    try {
      debugPrint('[IMPORTANT] Starting cloud upload for $filename ($type)');
      
      // 1. Get presigned URL from backend
      final resp = await get('/media/upload-url?filename=${Uri.encodeComponent(filename)}&type=$type');
      final String? uploadUrl = resp['uploadUrl'];
      final String? key = resp['key'];

      if (uploadUrl == null || key == null) {
        debugPrint('[IMPORTANT] Backend returned invalid upload info: $resp');
        throw Exception('Dados de upload inválidos do servidor');
      }

      // 2. PUT bytes to Cloudflare
      debugPrint('[IMPORTANT] PUT to Cloudflare R2 Key: $key');
      debugPrint('[IMPORTANT] Target URL: $uploadUrl');
      
      final uri = Uri.parse(uploadUrl);
      
      final putResp = await http.put(
        uri,
        body: bytes,
      );

      debugPrint('[IMPORTANT] Cloudflare Response Code: ${putResp.statusCode}');
      
      if (putResp.statusCode >= 200 && putResp.statusCode < 300) {
        debugPrint('[IMPORTANT] Cloudflare upload success: $key');
        return key;
      } else {
        debugPrint('[IMPORTANT] Cloudflare upload failed (${putResp.statusCode}): ${putResp.body}');
        throw ApiException(
          message: 'Falha no upload direto para nuvem (R2)',
          statusCode: putResp.statusCode,
        );
      }
    } catch (e) {
      debugPrint('[IMPORTANT] EXCEPTION during cloud upload: $e');
      rethrow;
    }
  }

  Future<String> uploadServiceAudio(
    List<int> bytes, {
    String filename = 'audio.m4a',
  }) async {
    if (bytes.length > 1 * 1024 * 1024) {
      debugPrint('[IMPORTANT] Large audio detected (${bytes.length} bytes), using Cloudflare R2');
      return await uploadToCloud(bytes, filename: filename, type: 'service');
    }
    final resp = await uploadMultipart(
      '/media/service/audio',
      'file',
      bytes,
      filename: filename,
      mimeType: 'audio/mp4',
    );
    return (resp['key'] ?? '').toString();
  }

  Future<String> uploadChatImage(
    String serviceId,
    List<int> bytes, {
    String filename = 'chat.jpg',
  }) async {
    if (bytes.length > 1 * 1024 * 1024) {
      debugPrint('[IMPORTANT] Large chat image detected (${bytes.length} bytes), using Cloudflare R2');
      return await uploadToCloud(bytes, filename: filename, type: 'chat');
    }
    final resp = await uploadMultipart(
      '/media/chat/image?serviceId=$serviceId',
      'file',
      bytes,
      filename: filename,
      mimeType: 'image/jpeg',
      extraFields: {'serviceId': serviceId},
    );
    return (resp['key'] ?? '').toString();
  }

  Future<String> getMediaViewUrl(String key) async {
    final resp = await get('/media/view?key=${Uri.encodeComponent(key)}');
    return (resp['url'] ?? '').toString();
  }

  // ========== CHAT ==========
  Future<List<dynamic>> getChatMessages(String serviceId) async {
    final result = await get('/chat/$serviceId/messages');
    return (result['messages'] as List?) ?? [];
  }

  Future<void> sendMessage(
    String serviceId,
    String content, {
    String type = 'text',
  }) async {
    await post('/chat/$serviceId/messages', {'content': content, 'type': type});
  }

  Future<String> uploadChatAudio(
    String serviceId,
    List<int> bytes, {
    String filename = 'audio.m4a',
    String mimeType = 'audio/mp4',
  }) async {
    if (bytes.length > 1 * 1024 * 1024) {
      debugPrint('[IMPORTANT] Large chat audio detected (${bytes.length} bytes), using Cloudflare R2');
      return await uploadToCloud(bytes, filename: filename, type: 'chat');
    }
    final resp = await uploadMultipart(
      '/media/chat/audio?serviceId=$serviceId',
      'file',
      bytes,
      filename: filename,
      mimeType: mimeType,
      extraFields: {'serviceId': serviceId},
    );
    return (resp['key'] ?? '').toString();
  }

  Future<String> uploadChatVideo(
    String serviceId,
    List<int> bytes, {
    String filename = 'video.mp4',
    String? mimeType,
  }) async {
    final resp = await uploadMultipart(
      '/media/chat/video?serviceId=$serviceId',
      'file',
      bytes,
      filename: filename,
      mimeType: mimeType ?? 'video/mp4',
      extraFields: {'serviceId': serviceId},
    );
    return (resp['key'] ?? '').toString();
  }

  Future<Uint8List> getMediaBytes(String key) {
    if (_mediaBytesCache.containsKey(key)) {
      return _mediaBytesCache[key]!;
    }
    final future = _fetchBytes(key);
    _mediaBytesCache[key] = future;
    return future;
  }

  Future<Uint8List> _fetchBytes(String key) async {
    try {
      // Use proxy route to avoid CORS issues on Web and ensure Auth
      final response = await getRaw(
        '/media/content?key=${Uri.encodeComponent(key)}',
      );
      if (response.statusCode == 200) {
        return response.bodyBytes;
      }
      throw Exception('Status ${response.statusCode}');
    } catch (e) {
      unawaited(_mediaBytesCache.remove(key));
      rethrow;
    }
  }

  Future<void> notifyProviderArrived(String serviceId) async {
    await post('/services/$serviceId/arrive', {});
  }

  Future<void> payRemainingService(String serviceId) async {
    await post('/services/$serviceId/pay_remaining', {});
  }

  Future<void> notifyClientArrived(String serviceId) async {
    await post('/services/$serviceId/client-arrived', {});
  }
}

class _FuelCacheItem {
  final Map<String, dynamic> data;
  final DateTime expiry;
  _FuelCacheItem({required this.data, required this.expiry});
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException({required this.message, required this.statusCode});
  @override
  String toString() => '$message (Status: $statusCode)';
}
