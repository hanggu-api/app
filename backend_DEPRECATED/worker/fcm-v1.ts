/**
 * Helper: Generate OAuth 2.0 Access Token from Service Account (JWT)
 */
export async function getAccessTokenFromServiceAccount(serviceAccountJson: string): Promise<string | null> {
    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        const {
            client_email,
            private_key
        } = serviceAccount;

        // JWT Header
        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };

        // JWT Claims
        const now = Math.floor(Date.now() / 1000);
        const claims = {
            iss: client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/datastore',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        // Encode header and claims
        const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const encodedClaims = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

        const signatureInput = `${encodedHeader}.${encodedClaims}`;

        // Import private key for signing
        // FIX: Handle both actual newlines and literal \n characters, and strip all whitespace
        const keyData = private_key
            .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
            .replace(/\\n/g, '') // Remove literal \n characters
            .replace(/\s+/g, ''); // Remove all whitespace (including actual newlines)

        const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

        const cryptoKey = await crypto.subtle.importKey(
            'pkcs8',
            binaryKey,
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256'
            },
            false,
            ['sign']
        );

        // Sign the JWT
        const encoder = new TextEncoder();
        const signature = await crypto.subtle.sign(
            'RSASSA-PKCS1-v1_5',
            cryptoKey,
            encoder.encode(signatureInput)
        );

        // Encode signature
        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

        const jwt = `${signatureInput}.${encodedSignature}`;

        // Exchange JWT for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('[OAuth] Token exchange failed:', errorText);
            return null;
        }

        const tokenData: any = await tokenResponse.json();
        return tokenData.access_token;
    } catch (error: any) {
        console.error('[OAuth] Error generating access token:', error.message);
        return null;
    }
}

/**
 * Helper: Send FCM Push Notification via FCM HTTP v1 API
 */
export async function sendFCMNotificationV1(
    serviceAccountJson: string,
    token: string,
    payload: { title: string; body: string; data?: any }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        console.log(`[FCM v1] ====== Sending Notification ======`);
        console.log(`[FCM v1] Token: ${token.substring(0, 40)}...`);
        console.log(`[FCM v1] Title: ${payload.title}`);
        console.log(`[FCM v1] Body: ${payload.body}`);
        console.log(`[FCM v1] Data: ${JSON.stringify(payload.data)}`);

        // Extract project ID from service account
        const serviceAccount = JSON.parse(serviceAccountJson);
        const projectId = serviceAccount.project_id;

        // Get OAuth access token
        console.log('[FCM v1] Generating OAuth access token...');
        const accessToken = await getAccessTokenFromServiceAccount(serviceAccountJson);

        if (!accessToken) {
            console.error('[FCM v1] Failed to get access token');
            return { success: false, error: 'Failed to get access token' };
        }

        console.log('[FCM v1] Access token generated successfully');

        // FCM v1 API endpoint
        const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

        // FCM v1 message format
        const messageBody: any = {
            token: token,
            notification: {
                title: payload.title || '',
                body: payload.body || ''
            },
            data: {
                ...(payload.data || {}),
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            android: {
                priority: 'HIGH',
                notification: {
                    channel_id: 'high_importance_channel_v3',
                    visibility: 'PUBLIC',
                    notification_priority: 'PRIORITY_MAX',
                    sound: 'iphone_notificacao'
                }
            },
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: payload.title,
                            body: payload.body
                        },
                        sound: 'iphone_notificacao.caf',
                        badge: 1,
                        'interruption-level': 'critical'
                    }
                }
            }
        };

        if (payload.title || payload.body) {
            messageBody.notification = {
                title: payload.title || '',
                body: payload.body || ''
            };
        }

        const message = { message: messageBody };

        // If it's a new service/offer, we send it as a data-only message 
        // to ensure the app's background handler is triggered and shows the custom UI/Modal.
        const isUrgent = payload.data?.type === 'new_service' ||
            payload.data?.type === 'offer' ||
            payload.data?.type === 'service_offered' ||
            payload.data?.type === 'service_dispatch';

        if (isUrgent) {
            console.log('[FCM v1] Urgent offer detected. Enhancing for reliability with DUAL payload (Notification + Data).');

            // We KEEP the notification block, as it's more reliable for waking up devices/lockscreens.
            // But we also ensure all critical fields are in the DATA block.
            if (messageBody.notification) {
                messageBody.notification.title = payload.title;
                messageBody.notification.body = payload.body;
            }

            if (messageBody.android) {
                messageBody.android.priority = 'HIGH';
                // Android specific: Ensure it's public and high priority
                messageBody.android.notification = {
                    ...messageBody.android.notification,
                    channel_id: 'high_importance_channel_v3',
                    visibility: 'PUBLIC',
                    notification_priority: 'PRIORITY_MAX',
                };
            }

            if (messageBody.apns) {
                messageBody.apns.payload.aps = {
                    ...messageBody.apns.payload.aps,
                    'content-available': 1,
                    'interruption-level': 'critical',
                    sound: 'iphone_notificacao.caf'
                };
                messageBody.apns.headers = {
                    'apns-priority': '10',
                    'apns-push-type': 'alert'
                };
            }

            // REDUNDANCY: Ensure title and body are also in the data payload
            messageBody.data = {
                ...(messageBody.data || {}),
                title: payload.title,
                body: payload.body,
            };
        }

        console.log(`[FCM v1] Sending to: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(message)
        });

        const responseText = await response.text();
        console.log(`[FCM v1] Response Status: ${response.status}`);
        console.log(`[FCM v1] Response Body: ${responseText}`);

        if (response.ok) {
            const responseJson = JSON.parse(responseText);
            const messageId = responseJson.name; // Projects/{project}/messages/{message_id}
            console.log(`[FCM v1] ✅ Notification sent successfully. ID: ${messageId}`);
            return { success: true, messageId };
        } else {
            console.error(`[FCM v1] ❌ Failed to send notification: ${response.status}`);
            return { success: false, error: `HTTP ${response.status}: ${responseText}` };
        }
    } catch (error: any) {
        console.error('[FCM v1] ❌ Error:', error.message);
        console.error('[FCM v1] Stack:', error.stack);
        return { success: false, error: error.message };
    }
}
