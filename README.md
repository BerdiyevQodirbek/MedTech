# UstaMed — Tibbiy uskuna ta’mirlash hisobini yuritish

React + Vite + Firebase asosidagi mobilga mos web-ilova. Interfeys o‘zbek tilida.

## Imkoniyatlar
- Uskunani qabul qilish: nomi, model, zavod raqami, muassasa, manzil, olib kelgan va qabul qilgan shaxs, sana, dastlabki tashxis, taxminiy narx.
- Bir nechta foto/video faylni Firebase Storage'ga yuklash.
- Holatlarni yuritish: Qabul qilindi, Diagnostika, Ta’mir jarayonida, Ta’mirlandi, Ta’mirsiz qaytarildi.
- Ta’mirlash jurnali: nosozlik sababi, yechim, almashtirilgan detal/izoh, ta’mirlash narxi.
- Qaytarib berish: uskuna holati, kim topshirdi, kim olib ketdi, sana, yakuniy narx, to‘lov usuli va to‘lov holati.
- Qidiruv, holat bo‘yicha filter, jadval/karta ko‘rinishi, statistik ko‘rsatkichlar.
- Firebase Authentication orqali kirish; Firestore va Storage bulutda saqlaydi.
- Telefon, planshet va desktop uchun responsive dizayn.

## 1. Firebase sozlash
1. https://console.firebase.google.com/ saytida yangi Firebase project yarating.
2. Project settings → General → Your apps → Web app qo‘shing. Berilgan config qiymatlarini oling.
3. Authentication → Sign-in method → Email/Password ni yoqing.
4. Authentication → Users ichidan mexanik muhandislar uchun foydalanuvchi email/parollarini yarating. Ilovada signup ham bor; ishlab chiqarish muhitida ochiq signup'ni cheklash tavsiya etiladi.
5. Firestore Database → Create database.
6. Storage → Get started.
7. Loyiha papkasida `.env.example` faylidan nusxa olib `.env` nomlang va qiymatlarni kiriting.

## 2. Ishga tushirish
Node.js 18+ o‘rnatilgan bo‘lsin.

```bash
npm install
npm run dev
```
Terminal ko‘rsatgan localhost manzilini brauzerda oching.

Production build:
```bash
npm run build
npm run preview
```

## 3. Tavsiya etilgan Firebase xavfsizlik qoidalari

**Firestore Rules** (Firebase Console → Firestore → Rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /repairs/{repairId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage Rules** (Firebase Console → Storage → Rules):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /repairs/{fileName} {
      allow read, write: if request.auth != null
        && request.resource.size < 100 * 1024 * 1024;
    }
  }
}
```

> Eslatma: yuqoridagi qoidalar barcha tizimga kirgan foydalanuvchilarga umumiy kirish beradi. Haqiqiy ishga tushirishdan oldin tashkilot, rol va ruxsatlarni cheklash, fayl turlarini tekshirish, audit log va zaxira nusxasini sozlash kerak. Firebase Rules'da Storage uchun mavjud faylni o‘chirish holatini alohida boshqarish lozim.

## 4. Ma’lumotlar tuzilmasi
Firestore `repairs` collection:
- `equipmentName`, `model`, `serialNumber`
- `organization`, `address`
- `broughtBy`, `acceptedBy`, `receivedAt`
- `diagnosis`, `estimatedPrice`
- `status`, `faultCause`, `solution`, `notes`
- `repairPrice`, `paymentMethod`, `paymentStatus`
- `returnStatus`, `returnedBy`, `takenBy`, `returnedAt`
- `media`: `{url, name, type, path}[]`
- `createdAt`, `updatedAt`, `createdBy`

## 5. Muhim eslatmalar
- Firebase config frontend ichida ishlatiladi; bu maxfiy server kaliti emas. Ma’lumotlarni himoyalash Firebase Security Rules orqali amalga oshiriladi.
- Hozircha ilova bitta umumiy `repairs` collection'dan foydalanadi. Keyingi bosqichda tashkilot/filial, xodim rollari, qabul-topshirish dalolatnomasi PDF, QR-kod, sarf materiallari, kafolat, SMS/Telegram bildirishnoma va analitik hisobot qo‘shish mumkin.
- Rasm/video fayllari Storage'ga yuklanadi, havolalari Firestore'da saqlanadi.
