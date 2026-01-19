import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:service_101/features/client/tracking_screen.dart';
import 'package:service_101/services/api_service.dart';
import 'package:service_101/services/realtime_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Fake Classes to avoid Mockito generation
// ignore: subtype_of_sealed_class
class FakeDocumentSnapshot implements DocumentSnapshot {
  final bool _exists;
  FakeDocumentSnapshot(this._exists);

  @override
  bool get exists => _exists;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeDatabaseEvent implements DatabaseEvent {
  final Map<String, dynamic> _data;
  FakeDatabaseEvent(this._data);

  @override
  DataSnapshot get snapshot => FakeDataSnapshot(_data);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeDataSnapshot implements DataSnapshot {
  final Map<String, dynamic> _data;
  FakeDataSnapshot(this._data);

  @override
  Object? get value => _data;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// Mock RealtimeService
class MockRealtimeService extends RealtimeService {
  MockRealtimeService() : super.testing();

  final _serviceController = StreamController<DocumentSnapshot>.broadcast();
  final _locationController = StreamController<DatabaseEvent>.broadcast();

  @override
  Stream<DocumentSnapshot> getServiceStream(String serviceId) {
    return _serviceController.stream;
  }

  @override
  Stream<DatabaseEvent> getProviderLocationStream(int providerId) {
    return _locationController.stream;
  }

  // Helper to simulate events
  void emitServiceUpdate() {
    _serviceController.add(FakeDocumentSnapshot(true));
  }

  void emitLocationUpdate(Map<String, dynamic> data) {
    _locationController.add(FakeDatabaseEvent(data));
  }
}

class MockHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
  }
}

void main() {
  late MockClient mockClient;
  late MockRealtimeService mockRealtime;

  setUp(() {
    RealtimeService.mockMode = true;
    HttpOverrides.global = MockHttpOverrides();
    SharedPreferences.setMockInitialValues({});

    // Setup Mock API
    mockClient = MockClient((request) async {
      if (request.url.path.contains('/services/123')) {
        // Return service details
        return http.Response(
          jsonEncode({
            'service': {
              'id': 123,
              'status': 'in_progress',
              'location_type': 'client',
              'latitude': -23.5505,
              'longitude': -46.6333,
              'provider': {
                'id': 999,
                'name': 'Provider Test',
                'photo_url': null,
              },
            },
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    ApiService().setClient(mockClient);
    mockRealtime = MockRealtimeService();
    RealtimeService.mockInstance = mockRealtime;
  });

  tearDown(() {
    HttpOverrides.global = null;
    RealtimeService.mockInstance = null;
  });

  testWidgets('TrackingScreen listens to real-time updates', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        home: TrackingScreen(
          serviceId: '123',
          realtimeService: mockRealtime,
          apiService: ApiService(),
        ),
      ),
    );

    // Initial load
    await tester.pump(); // Start InitState
    await tester.pump(const Duration(milliseconds: 100)); // Wait for async
    await tester.pumpAndSettle();

    expect(find.text('Provider Test'), findsOneWidget);
    expect(find.text('A caminho'), findsOneWidget); // Timeline item

    // Simulate Provider Location Update
    mockRealtime.emitLocationUpdate({
      'provider_id': 999,
      'latitude': -23.5510,
      'longitude': -46.6340,
    });

    await tester.pump();

    // Verify UI update (Map markers would move, but we can check internal state or side effects)
    // Since we can't easily check Map state without finding the MarkerLayer,
    // let's simulate a status change via 'service.updated' which calls _loadService.

    // Update Mock API response for next call
    ApiService().setClient(
      MockClient((request) async {
        if (request.url.path.contains('/services/123')) {
          return http.Response(
            jsonEncode({
              'service': {
                'id': 123,
                'status': 'completed', // Changed status
                'location_type': 'client',
                'arrived_at': '2024-01-01T10:00:00Z',
                'provider': {'id': 999, 'name': 'Provider Test'},
              },
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      }),
    );

    // Emit service.updated
    mockRealtime.emitServiceUpdate();

    // Wait for _loadService to complete
    await tester.pumpAndSettle();

    // Verify Status Update in UI
    expect(find.text('Concluído'), findsOneWidget);
    expect(find.text('Confirmar Conclusão'), findsOneWidget);
  });
}
