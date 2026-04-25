# 🔥 Backend Security Fix - UUID Empty String Bug

## 💥 Le Bug Critique Identifié

### Le Problème
```
invalid input syntax for type uuid: ""
```

### Cause Racine
Le JWT token du frontend contenait:
```json
{
  "institution_id": ""  // ← String vide au lieu de null
}
```

Quand on essayait de faire une requête PostgreSQL:
```sql
WHERE institution_id = ''::uuid  -- ❌ CRASH!
```

**Pourquoi ça casse?**
- PostgreSQL attend un UUID valide (exemple: `550e8400-e29b-41d4-a716-446655440000`)
- La string vide `""` n'est pas un UUID valide
- Resultat: ***invalid input syntax for type uuid***

---

## ✅ La Solution - 3 Couches de Defense

### 1️⃣ **Middleware (auth.ts) - Sanitize à la Source**

**NOUVEAU CODE:**
```typescript
// Remove empty strings that would fail UUID validation in PostgreSQL
institution_id: decodedPayload.institution_id && decodedPayload.institution_id.trim() 
  ? decodedPayload.institution_id 
  : null,
```

**Ce que ça fait:**
- ✅ Vérifie que `institution_id` existe
- ✅ Trim les espaces
- ✅ Convertit `""` → `null` (safe pour PostgreSQL)
- ✅ FIX APPLIQUÉ À LA SOURCE avant d'arriver aux routes

### 2️⃣ **Route (routes.ts) - Validation Stricte**

**NOUVEAU CODE:**
```typescript
// Non-admin users MUST have institution_id
if (!user.is_admin && !user.institution_id) {
  // No institution context = return empty list (user has no access)
  return reply.send({ data: [], count: 0 });
}
```

**Ce que ça fait:**
- ✅ Vérife qu'on ne va JAMAIS faire de requête avec `institution_id = null`
- ✅ Retourne un array vide au lieu de crasher
- ✅ Comportement gracieux: utilisateur voit aucune conversation (attendu)

### 3️⃣ **Query Builder (queries.ts) - Double Check**

**EXISTING CODE (déjà bon):**
```typescript
if (!user.is_admin) {
  if (!user.institution_id) {
    return []; // No institution_id = no access
  }
  query = query.eq('institution_id', user.institution_id);
}
```

---

## 🎯 Comportements Attendus Après Fix

| Scénario | JWT | Résultat |
|----------|-----|----------|
| Admin + `institution_id` fourni | ✅ | Voir TOUTES les conversations |
| Admin + `institution_id` absent | ✅ | Voir TOUTES les conversations |
| Non-admin + `institution_id` valide | ✅ | Voir SEULEMENT ses conversations |
| Non-admin + `institution_id = ""` | ❌ → ✅ | Converti en `null` → voir `[]` |
| Non-admin + `institution_id` absent | ✅ | Voir `[]` (array vide) |

---

## 🔒 Sécurité - Ce Qui A Été Fixé

### ❌ AVANT
```
Frontend JWT → "" → Middleware (pass-through) → Routes → Supabase → 💥 CRASH
```

### ✅ APRÈS
```
Frontend JWT → "" → Middleware (sanitize) → null → Routes (validate) → [] ou Query
```

---

## 📋 What Frontend Must Send

### ✅ Cas Idéal - Pour un utilisateur d'institution
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_type": "institution",
  "is_admin": false,
  "institution_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",  // ← UUID valide
  "institution_type": "universite",
  "email": "admin@universite.com"
}
```

### ✅ Cas Admin
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_type": "admin",
  "is_admin": true,
  "institution_id": null,  // ← Admin ne besoin pas d'institution
  "email": "admin@universearch.com"
}
```

### ❌ Cas Problématique - Ce qu'il NE FAUT PAS envoyer
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_type": "institution",
  "is_admin": false,
  "institution_id": "",  // ← NE PAS ENVOYER "" ❌
  "email": "admin@universite.com"
}
```

---

## 🚀 Commandes de Test

```bash
# 1. Redémarrer le serveur
npm run dev

# 2. Test avec cURL (remplace le JWT)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3006/conversations?limit=50&offset=0

# 3. Vérifier le JWT token
# - Va sur login page
# - Ouvre DevTools → Application → Local Storage
# - Regarde softura_session.jwt_token
# - Va sur https://jwt.io et décode-le
# - Vérifie que institution_id est présent (pas vide)
```

---

## 📊 Files Modifiés

1. **`src/middleware/auth.ts`**
   - ✅ Sanitize JWT payload à la source
   - ✅ Convertit `""` → `null`
   - ✅ Trim les espaces

2. **`src/routes.ts`**
   - ✅ Validation stricte avant requête Supabase
   - ✅ Comportement gracieux pour utilisateurs sans institution

3. **`src/types/index.ts`**
   - ✅ Permite nullable fields
   - ✅ Types corrects pour institution_type

4. **`src/modules/messages/queries.ts`**
   - ✅ Double validation avant requête

---

## 🎓 Leçons Apprises

| Leçon | Détail |
|--------|--------|
| **Empty String ≠ Null** | PostgreSQL UUID strict → toujours utiliser `null` pour "absent" |
| **Sanitize at Source** | Le middleware doit nettoyer le JWT, pas les routes |
| **Defense in Depth** | 3 niveaux: middleware → route → query |
| **Graceful Degradation** | Empty array beats 500 error pour UX |
| **Type Safety** | TypeScript aide mais ne peut pas tout attraper |

---

## Status

✅ **FIXED** - Prêt pour production après test complet
