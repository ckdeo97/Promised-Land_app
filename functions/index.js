const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendPushNotification = functions.firestore
  .document('notifications/{docId}')
  .onCreate(async (snap, context) => {
    const notiData = snap.data();
    
    // 유저 DB에서 토큰(fcmToken) 싹 다 긁어오기
    const usersSnap = await admin.firestore().collection('users').get();
    const tokens = [];
    
    usersSnap.forEach(doc => {
      const user = doc.data();
      if (user.fcmToken) {
        tokens.push(user.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log('알림을 보낼 토큰이 없습니다.');
      return null;
    }

    const payload = {
      notification: {
        title: notiData.title,
        body: notiData.body || '',
      },
      tokens: tokens
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log(response.successCount + '건 발송 성공!');
    } catch (error) {
      console.error('발송 에러:', error);
    }
  });