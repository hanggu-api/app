import 'dart:async';
import 'dart:math';

class MockApiService {
  static final MockApiService _instance = MockApiService._internal();
  factory MockApiService() => _instance;
  MockApiService._internal();

  bool get isLoggedIn => true;
  String? get role => 'client';
  bool get isMedical => false;
  bool get isFixedLocation => false;

  Future<Map<String, dynamic>> login(String token) async {
    await Future.delayed(const Duration(seconds: 1));
    return {
      'success': true,
      'user': {
        'id': 1,
        'full_name': 'Usuário Demo',
        'email': 'demo@101service.com',
        'role': 'client',
        'phone': '11999999999',
      },
      'token': 'mock_token_123'
    };
  }

  Future<Map<String, dynamic>> getProfile() async {
    return {
      'success': true,
      'user': {
        'id': 1,
        'full_name': 'Usuário Demo',
        'email': 'demo@101service.com',
        'role': 'client',
        'phone': '11999999999',
      }
    };
  }

  Future<List<Map<String, dynamic>>> getMyServices() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return [
      {
        'id': 101,
        'status': 'accepted',
        'provider_name': 'João Silva',
        'profession': 'Eletricista',
        'description': 'Reparo de fiação em curto circuito',
        'price_estimated': 150.00,
        'price_upfront': 50.00,
        'scheduled_at': DateTime.now().add(const Duration(hours: 2)).toIso8601String(),
        'service_type': 'on_site',
      },
      {
        'id': 102,
        'status': 'pending',
        'provider_name': null,
        'profession': 'Encanador',
        'description': 'Vazamento na pia da cozinha',
        'price_estimated': 100.00,
        'price_upfront': 30.00,
        'scheduled_at': DateTime.now().add(const Duration(days: 1)).toIso8601String(),
        'service_type': 'on_site',
      }
    ];
  }

  Future<Map<String, dynamic>> getServiceDetails(String id) async {
    return {
      'id': int.tryParse(id) ?? 101,
      'status': 'accepted',
      'provider_name': 'João Silva',
      'profession': 'Eletricista',
      'description': 'Reparo de fiação em curto circuito',
      'price_estimated': 150.00,
      'price_upfront': 50.00,
      'scheduled_at': DateTime.now().add(const Duration(hours: 2)).toIso8601String(),
      'service_type': 'on_site',
      'location_type': 'on_site',
      'latitude': -23.5505,
      'longitude': -46.6333,
    };
  }

  Future<Map<String, dynamic>> createService(Map<String, dynamic> data) async {
    await Future.delayed(const Duration(seconds: 2));
    return {
      'success': true,
      'service': {
        'id': Random().nextInt(1000) + 200,
        ...data,
        'status': 'pending',
      }
    };
  }

  Future<Map<String, dynamic>> processPayment(Map<String, dynamic> data) async {
    await Future.delayed(const Duration(seconds: 2));
    return {
      'success': true,
      'payment': {
        'id': 'pay_' + Random().nextInt(100000).toString(),
        'status': 'approved',
      }
    };
  }

  Future<List<dynamic>> getProfessions() async {
    return [
      {'id': 1, 'name': 'Eletricista'},
      {'id': 2, 'name': 'Encanador'},
      {'id': 3, 'name': 'Pintor'},
      {'id': 4, 'name': 'Mecânico'},
      {'id': 5, 'name': 'Limpeza'},
    ];
  }
}
