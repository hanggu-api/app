// Código completo para o mapa com rota (linhas 241-265)
                                    children: [
                                      TileLayer(
                                        urlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                        userAgentPackageName = 'com.play101.app',
                                      ),
                                      // Polyline Layer - Rota do prestador ao serviço
                                      if (_providerLocation != null)
                                        PolylineLayer(
                                          polylines = [
                                            Polyline(
                                              points: [
                                                _providerLocation!,
                                                LatLng(
                                                  double.tryParse(s['latitude'].toString()) ?? 0,
                                                  double.tryParse(s['longitude'].toString()) ?? 0,
                                                ),
                                              ],
                                              color: Colors.blue,
                                              strokeWidth: 4.0,
                                            ),
                                          ],
                                        ),
                                      MarkerLayer(
                                        markers = [
                                          // Marcador do prestador (verde)
                                          if (_providerLocation != null)
                                            Marker(
                                              point: _providerLocation!,
                                              width: 40,
                                              height: 40,
                                              child: Container(
                                                decoration: BoxDecoration(
                                                  color: Colors.green.withOpacity(0.3),
                                                  shape: BoxShape.circle,
                                                ),
                                                child: const Icon(
                                                  Icons.person_pin_circle,
                                                  color: Colors.green,
                                                  size: 30,
                                                ),
                                              ),
                                            ),
                                          // Marcador do serviço (azul)
                                          Marker(
                                            point: LatLng(
                                               double.tryParse(s['latitude'].toString()) ?? 0,
                                               double.tryParse(s['longitude'].toString()) ?? 0,
                                            ),
                                            width: 40,
                                            height: 40,
                                            child: Container(
                                               decoration: BoxDecoration(
                                                 color: AppTheme.primaryPurple.withOpacity(0.2),
                                                 shape: BoxShape.circle,
                                               ),
                                               child: const Icon(Icons.location_on, color: Colors.blue, size: 30),
                                             ),
                                          ),
                                        ],
                                      ),
                                    ],
