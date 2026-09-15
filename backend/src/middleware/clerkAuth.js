const { getAuth } = require('@clerk/backend');

module.exports = async (req, res, next) => {
  try {
    // دریافت توکن از هدر Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'توکن ارسال نشده است' });
    }

    const token = authHeader.split(' ')[1];

    // اعتبارسنجی توکن با استفاده از getAuth (روش جدید)
    // نکته: در نسخه‌های جدید @clerk/backend باید از verifyToken استفاده کرد یا کلاینت را پاس داد
    const { secretKey } = process.env;
    
    // روش ساده‌تر با استفاده از verifyToken مستقیم
    const { verifyToken } = require('@clerk/backend');
    
    const { payload } = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });

    // attaching user info to request object
    req.user = {
      id: payload.sub,
      email: payload.email, // ممکن است نیاز باشد از payload.extraFields بگیرید
      name: payload.name
    };

    next();
  } catch (error) {
    console.error('Clerk Auth Error:', error);
    res.status(401).json({ message: 'احراز هویت نامعتبر', error: error.message });
  }
};