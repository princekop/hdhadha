```javascript
import React, { useState } from 'react';

function TodoItem({ todo, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  const handleToggle = () => {
    onToggle(todo.id);
  };

  const handleUpdate = (e) => {
    setEditText(e.target.value);
  };

  const handleSave = () => {
    onUpdate(todo.id, editText);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = () => {
    onDelete(todo.id);
  };

  return (
    <li className="todo-item">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
      />
      {isEditing ? (
        <>
          <input
            type="text"
            value={editText}
            onChange={handleUpdate}
            autoFocus
          />
          <button onClick={handleSave}>Save</button>
        </>
      ) : (
        <span
          style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
        >
          {todo.text}
        </span>
      )}
      <button onClick={handleEdit} style={{ display: !isEditing ? 'inline-block' : 'none' }}>
        Edit
      </button>
      <button onClick={handleDelete}>Delete</button>
    </li>
  );
}

export default TodoItem;
```
