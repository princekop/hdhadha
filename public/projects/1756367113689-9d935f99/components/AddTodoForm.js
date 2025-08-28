```javascript
import React, { useState, useContext } from 'react';
import { TodoContext } from '../pages/index';

function AddTodoForm() {
  const [newTodo, setNewTodo] = useState('');
  const { addTodo } = useContext(TodoContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newTodo.trim() !== '') {
      addTodo(newTodo);
      setNewTodo('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-todo-form">
      <input
        type="text"
        value={newTodo}
        onChange={(e) => setNewTodo(e.target.value)}
        placeholder="Add a new todo..."
        required
      />
      <button type="submit">Add</button>
    </form>
  );
}

export default AddTodoForm;
```
