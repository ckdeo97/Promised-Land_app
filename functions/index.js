const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

/**
 * notifications 컬렉션에 문서 생성 시 FCM 푸시 발송
 * - _noti.push !== false 인 유저에게만 발송
 * - fcmToken 없는 유저는 스킵
 */
exports.sendPushOnNotification = onDocumentCreated(
  'notifications/{notiId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { title, body } = data;
    if (!title) return;

    const db = getFirestore();
    const messaging = getMessaging();

    // 활성 유저 중 푸시 알림 켠 유저 조회
    const usersSnap = await db.collection('users')
      .where('status', '==', 'active')
      .get();

    const tokens = [];
    usersSnap.forEach(doc => {
      const u = doc.data();
      // _noti.push 가 명시적으로 false 면 제외, 나머지는 발송
      if (u.fcmToken && u._noti?.push !== false) {
        tokens.push(u.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log('발송할 대상 없음');
      return;
    }

    console.log(`발송 대상: ${tokens.length}명`);

    // 100개씩 배치 발송 (FCM 제한)
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(tokens.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: {
            title: title,
            body: body || '',
          },
          webpush: {
            notification: {
              icon: '/asset/logo.png',
              badge: '/asset/logo.png',
            },
            fcmOptions: {
              link: 'https://promiand-app.web.app',
            },
          },
        });

        // 유효하지 않은 토큰 정리
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(chunk[idx]);
            }
          }
        });

        // 만료된 토큰 Firestore에서 제거
        if (invalidTokens.length > 0) {
          const batch = db.batch();
          const tokenSnap = await db.collection('users')
            .where('fcmToken', 'in', invalidTokens)
            .get();
          tokenSnap.forEach(doc => {
            batch.update(doc.ref, { fcmToken: null });
          });
          await batch.commit();
          console.log(`만료 토큰 ${invalidTokens.length}개 정리`);
        }

        console.log(`성공: ${response.successCount}, 실패: ${response.failureCount}`);
      } catch (err) {
        console.error('FCM 발송 오류:', err);
      }
    }
  }
);
