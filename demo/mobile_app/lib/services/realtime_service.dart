import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class RealtimeService {
  static RealtimeService? _mockInstance;
  static set mockInstance(RealtimeService? mock) => _mockInstance = mock;

  static final RealtimeService _instance = RealtimeService._internal();
  factory RealtimeService() => _mockInstance ?? _instance;

  bool _initialized = false;
  StreamSubscription? _locationSub;

  RealtimeService._internal() {
    if (!mockMode) {
      try {
        _firestore = FirebaseFirestore.instance;
        _rtdb = FirebaseDatabase.instance;
      } catch (e) {
        debugPrint('Warning: Firebase not initialized in RealtimeService');
      }
    }
  }

  /// Inicializa o serviço (Singleton/Idempotente)
  void init(int userId) {
    if (_initialized && _currentUserId == userId) {
      debugPrint('⚠️ RTDB já inicializado para user $userId, ignorando...');
      return;
    }

    _initialized = true;
    _currentUserId = userId;
    debugPrint('✅ Firebase RealtimeService initialized for user $userId');
    _listenToUserEvents(userId);
  }

  @visibleForTesting
  RealtimeService.testing();

  static bool mockMode = false;

  late final FirebaseFirestore _firestore;
  late final FirebaseDatabase _rtdb;

  // Timer? _locationTimer; // Replaced by StreamSubscription
  DateTime? _lastLocationUpdate;
  int? _currentUserId;
  final Map<String, List<Function(dynamic)>> _eventListeners = {};
  StreamSubscription? _userEventsSub;

  /// Conecta ao serviço (Mantido para compatibilidade)
  void connect() {
    debugPrint(
      '🔥 Firebase RealtimeService connect() called (use init(userId) for full setup)',
    );
  }

  void authenticate(int userId) {
    // Redireciona para init que agora é Singleton-safe
    init(userId);
  }

  /// Retorna stream do serviço para atualizações de status
  Stream<DocumentSnapshot> getServiceStream(String serviceId) {
    return _firestore.collection('services').doc(serviceId).snapshots();
  }

  /// Retorna stream de localização do prestador
  Stream<DatabaseEvent> getProviderLocationStream(int providerId) {
    return _rtdb.ref('locations/$providerId').onValue;
  }

  /// Retorna stream de mensagens do chat
  Stream<QuerySnapshot> getChatStream(String serviceId) {
    return _firestore
        .collection('services')
        .doc(serviceId)
        .collection('messages')
        .snapshots();
  }

  // --- Métodos de Compatibilidade (Depreciados/Adaptados) ---

  void joinService(String serviceId) {
    // No Firebase não precisamos dar "join", apenas ouvir o stream.
    // Mantido para não quebrar chamadas existentes imediatamente.
  }

  void leaveService() {}

  void onEvent(String event, Function(dynamic) handler) {
    _eventListeners.putIfAbsent(event, () => []).add(handler);
  }

  void offEvent(String event, Function(dynamic) handler) {
    if (_eventListeners.containsKey(event)) {
      _eventListeners[event]!.remove(handler);
    }
  }

  void on(String event, Function(dynamic) handler) => onEvent(event, handler);
  void off(String event, Function(dynamic) handler) => offEvent(event, handler);

  void _listenToUserEvents(int userId) {
    if (mockMode) return;
    _userEventsSub?.cancel();
    debugPrint('🎧 Ouvindo eventos RTDB para user: $userId');

    // Escuta novos eventos adicionados à lista
    _userEventsSub = _rtdb
        .ref('events/$userId')
        .limitToLast(1)
        .onChildAdded
        .listen((event) {
          final val = event.snapshot.value;
          if (val is Map) {
            final type = val['type'];
            final payload = val['payload'];
            final timestamp = val['timestamp'];

            // Validate timestamp to prevent stale events on startup
            if (timestamp != null && timestamp is int) {
              final eventTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
              final now = DateTime.now();
              // If event is older than 60 seconds, ignore it
              if (now.difference(eventTime).inSeconds > 60) {
                debugPrint(
                  '🕰️ Ignorando evento antigo ($type) de ${eventTime.toIso8601String()}',
                );
                return;
              }
            }

            if (type != null && _eventListeners.containsKey(type)) {
              debugPrint('📨 Evento recebido ($type): $payload');
              for (final h in _eventListeners[type]!) {
                try {
                  h(payload);
                } catch (e) {
                  debugPrint('Erro no handler de evento $type: $e');
                }
              }
            }
          }
        });
  }

  // --- Lógica de Localização ---

  void startLocationUpdates(int userId) {
    _locationSub?.cancel();
    _currentUserId = userId;

    // Configuração de Stream com filtro de distância
    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Mínimo 10 metros para notificar
    );

    debugPrint(
      '📍 Iniciando atualizações de localização (Stream) para user:$userId',
    );

    _locationSub = Geolocator.getPositionStream(locationSettings: settings)
        .listen((position) {
          final now = DateTime.now();
          // Debounce/Throttle manual de 10 segundos
          if (_lastLocationUpdate == null ||
              now.difference(_lastLocationUpdate!).inSeconds >= 10) {
            _lastLocationUpdate = now;
            _updateLocationInFirebase(position);
          }
        });
  }

  void stopLocationUpdates() {
    _locationSub?.cancel();
    _locationSub = null;
    debugPrint('📍 Parando atualizações de localização');
  }

  Future<void> _updateLocationInFirebase(Position position) async {
    if (_currentUserId == null) return;
    try {
      // Escreve no Realtime Database
      await _rtdb.ref('locations/$_currentUserId').set({
        'latitude': position.latitude,
        'longitude': position.longitude,
        'timestamp': ServerValue.timestamp,
        'heading': position.heading,
        'speed': position.speed,
      });
    } catch (e) {
      debugPrint('⚠️ Erro ao atualizar localização no Firebase: $e');
    }
  }

  // Método antigo removido (_sendLocationUpdate) pois agora usamos stream

  // --- Presença ---

  void checkStatus(int userId, void Function(bool isOnline) callback) {
    // Verificação simples no RTDB
    _rtdb.ref('status/$userId').once().then((event) {
      final val = event.snapshot.value;
      callback(val != null && (val as Map)['state'] == 'online');
    });
  }

  void onPresenceUpdate(void Function(int userId, bool isOnline) handler) {
    // Escutar mudanças globais de status seria custoso aqui.
    // Idealmente, escutar status de usuários específicos.
  }

  void dispose() {
    stopLocationUpdates();
  }
}
