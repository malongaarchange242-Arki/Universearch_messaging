# Messaging Service

Messaging microservice with role-based access control for universities and admins.

## Features

- **Role-Based Access Control**: Institutions see only their own conversations with admin; admin sees all conversations
- **JWT Authentication**: Secure token-based authentication
- **Message Persistence**: PostgreSQL via Supabase
- **Pagination**: Efficient data retrieval with limit/offset
- **File Attachment Support**: Messages can include file metadata
- **Message Editing**: Users can edit their own messages
- **Message Deletion**: Owner or admin can delete messages
- **Conversation Tracking**: Mark conversations as read

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account and project
- Environment variables configured

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update the environment variables with your Supabase credentials and other settings.

### Development

```bash
npm run dev
```

The service will start on `http://localhost:3006`

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Conversations

#### GET /conversations
Get all conversations accessible to the current user
- **Auth**: Required (JWT)
- **Query Parameters**:
  - `limit`: Number of results (default: 50, max: 100)
  - `offset`: Pagination offset (default: 0)
- **Response**: Array of conversations

**Admin Example** (sees all):
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3006/conversations
```

**Institution Example** (sees only their own):
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3006/conversations
```

#### GET /conversations/:id
Get a specific conversation
- **Auth**: Required (JWT)
- **Access Control**: Admin sees all; others see only their own
- **Response**: Conversation object

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3006/conversations/conv-123
```

#### GET /conversations/:id/messages
Get messages in a conversation
- **Auth**: Required (JWT)
- **Query Parameters**:
  - `limit`: Number of results (default: 50, max: 100)
  - `offset`: Pagination offset (default: 0)
- **Response**: Array of messages

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3006/conversations/conv-123/messages?limit=20&offset=0
```

### Messages

#### POST /messages
Create a new message
- **Auth**: Required (JWT)
- **Body**:
  ```json
  {
    "conversation_id": "conv-123",
    "text": "Message content",
    "file_name": "document.pdf",
    "file_url": "https://..."
  }
  ```
- **Response**: Created message object

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv-123",
    "text": "Hello from institution"
  }' \
  http://localhost:3006/messages
```

#### PUT /messages/:id
Update a message (owner only)
- **Auth**: Required (JWT)
- **Authorization**: Owner of message or admin
- **Body**:
  ```json
  {
    "text": "Updated message content"
  }
  ```
- **Response**: Updated message object

```bash
curl -X PUT -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated message"}' \
  http://localhost:3006/messages/msg-123
```

#### DELETE /messages/:id
Delete a message (owner or admin)
- **Auth**: Required (JWT)
- **Authorization**: Owner of message or admin
- **Response**: 204 No Content

```bash
curl -X DELETE -H "Authorization: Bearer <token>" \
  http://localhost:3006/messages/msg-123
```

### Conversation Status

#### POST /conversations/:id/read
Mark conversation as read
- **Auth**: Required (JWT)
- **Response**: Status confirmation

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3006/conversations/conv-123/read
```

## Database Schema

### conversations table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  institution_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_admin_id ON conversations(admin_id);
CREATE INDEX idx_conversations_institution_id ON conversations(institution_id);
```

### messages table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_id UUID NOT NULL,
  sender_type VARCHAR NOT NULL CHECK (sender_type IN ('admin', 'institution')),
  text TEXT NOT NULL,
  file_name VARCHAR,
  file_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### conversation_reads table (optional, for tracking read status)
```sql
CREATE TABLE conversation_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL,
  read_at TIMESTAMP NOT NULL,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_reads_user_id ON conversation_reads(user_id);
```

## JWT Token Structure

Expected JWT payload structure:
```json
{
  "user_id": "uuid-string",
  "user_type": "admin|institution|user",
  "is_admin": true|false,
  "institution_id": "uuid-string",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Architecture

- **Framework**: Fastify (high-performance server)
- **Language**: TypeScript (type-safe)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT
- **Logging**: Pino
- **Validation**: Manual validation (can be extended with Zod)

## Access Control Model

### Institution Users
- Can **view** only their own conversation with the admin
- Can **create** messages in their conversation
- Can **edit** their own messages
- Can **delete** their own messages
- Cannot **access** other institutions' conversations

### Admin Users
- Can **view** all conversations
- Can **create** messages in any conversation
- Can **edit** any message
- Can **delete** any message
- Full **access** to all conversations

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common HTTP Status Codes:
- `200 OK` - Successful request
- `201 Created` - Resource created
- `204 No Content` - Successful deletion
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but access denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Performance Considerations

1. **Pagination**: Always use limit/offset for large conversation threads
2. **Indexing**: Ensure database has proper indexes on frequently queried columns
3. **Caching**: Consider Redis for frequently accessed conversations (optional enhancement)
4. **Connection Pooling**: Supabase handles connection pooling automatically

## Future Enhancements

- WebSocket support for real-time messages
- Message search/full-text search
- File upload/storage integration
- Message reactions/emoji support
- Typing indicators
- Message threads/nested replies
- Rich text formatting
- End-to-end encryption (optional)

## Troubleshooting

### 401 Unauthorized
- Verify JWT token is valid and not expired
- Ensure Authorization header format: `Bearer <token>`
- Check token payload has required fields

### 403 Forbidden
- Institution users can only access their own institution's data
- Ensure user has proper role in JWT token
- Admin users have full access

### 500 Internal Server Error
- Check Supabase credentials in `.env`
- Verify database tables exist with correct schema
- Check server logs for detailed error information

## License

Proprietary - UNIVERSEARCH
