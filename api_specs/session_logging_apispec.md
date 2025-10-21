# API Specification: SessionLogging Concept

**Purpose:** capture photo records of a user's activity during a trip session

---

## API Endpoints

### POST /api/SessionLogging/startSession

**Description:** Starts a new photo logging session for a specified user.

**Requirements:**
- user to exist

**Effects:**
- creates a new session (active = true) under the user

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "session": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/SessionLogging/addEntry

**Description:** Adds an image entry to an active session owned by the user.

**Requirements:**
- user to exist
- session and image must exist
- session must be active and belong to user

**Effects:**
- adds image to the set of images associated with the session

**Request Body:**
```json
{
  "user": "string",
  "session": "string",
  "image": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/SessionLogging/endSession

**Description:** Ends an active session, making it impossible to add new entries.

**Requirements:**
- user to exist
- session must exist and belong to user.
- Session must be active

**Effects:**
- ends the session (active = false)

**Request Body:**
```json
{
  "user": "string",
  "session": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---