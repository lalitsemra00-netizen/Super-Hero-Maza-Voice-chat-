# Super Hero Maza Voice Chat — Admin Website Starter

Is project mein ye features hain:
- Admin username/password login (password database mein bcrypt hash ke roop mein store hota hai)
- Photo/video upload aur delete
- SQLite database mein permanent seller list; add/edit/delete
- SVIP-1 se SVIP-8 offers edit karna
- Public website par media, sellers aur SVIP offers show hona
- Agency joining form jo WhatsApp message prepare karta hai

## Local computer par chalane ka tarika

1. Node.js 20 ya usse naya version install karein: https://nodejs.org/
2. Is folder ke andar terminal/command prompt kholein.
3. Dependencies install karein:
   `npm install`
4. `.env.example` ki copy banayein aur uska naam `.env` rakhein.
5. `.env` mein `ADMIN_USERNAME`, `ADMIN_PASSWORD`, aur `SESSION_SECRET` ko apne secret values se replace karein. Example password ko kabhi use na karein.
6. Start karein:
   `npm start`
7. Browser mein kholein:
   - Public website: `http://localhost:3000`
   - Admin login: `http://localhost:3000/admin.html`

## Hosting par live karne ka tarika

1. Node.js application support karne wali hosting chunein.
2. Project files upload ya private Git repository se deploy karein.
3. Hosting ke Environment Variables mein `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production` aur `DATA_DIR` set karein.
4. Persistent disk/storage ko `DATA_DIR` ke path par mount karein. SQLite database aur uploaded media dono usi jagah save hote hain. Persistent disk ke bina redeploy/restart par data kho sakta hai.
5. HTTPS enable karein; production cookie `secure` flag HTTPS ke liye set hota hai.
6. Database aur uploads ka regular backup banayein.

## Important production notes

- Ye starter ek single Node.js server + persistent disk ke liye hai. Multiple server instances use karne par session store aur shared media storage ko configure karna hoga.
- Admin password ko secure rakhein; `.env` ya database ko public repository mein upload na karein.
- Public seller contact details sirf permission ke saath publish karein.
- Upload filter basic protection hai, complete malware scanning nahi. Public launch se pehle production security review, backups, upload scanning and privacy notice add karna behtar hai.
- SVIP prices demo/sample values hain. Live karne se pehle actual current rates verify karein.
- Maza/voice-chat brand assets aur offers use karne ke liye apne paas required authorization honi chahiye.

## File structure

- `server.js` — API, login, upload, database
- `public/index.html` — public website
- `public/admin.html` — admin dashboard
- `public/style.css` — styling
- `public/app.js` — public data rendering and join form
- `public/admin.js` — admin dashboard actions
- `.env.example` — configuration template
