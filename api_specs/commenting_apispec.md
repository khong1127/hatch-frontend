# API Specification: Commenting Concept

**Purpose:** enable discussion around shared posts

---

## API Endpoints

### POST /api/Commenting/addComment

**Description:** Creates a new comment authored by a user under a specific post with provided content.

**Requirements:**
- author and post must exist
- content cannot be empty

**Effects:**
- creates a comment authored by the user under the post with the content as text

**Request Body:**
```json
{
  "author": "User",
  "content": "String",
  "post": "Post"
}
```

**Success Response Body (Action):**
```json
{
  "comment": "Comment"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Commenting/deleteComment

**Description:** Deletes a specific comment, provided the requesting user is the author.

**Requirements:**
- comment must exist
- comment must be authored by the user

**Effects:**
- deletes the comment

**Request Body:**
```json
{
  "user": "User",
  "comment": "Comment"
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

### POST /api/Commenting/editComment

**Description:** Edits the content of an existing comment, provided the requesting user is the author and new content is not empty.

**Requirements:**
- comment must exist
- comment must be authored by the user
- new_content cannot be empty

**Effects:**
- edits the comment content to be that of new_content

**Request Body:**
```json
{
  "user": "User",
  "comment": "Comment",
  "new_content": "String"
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