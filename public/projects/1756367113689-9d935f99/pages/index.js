```javascript
import { useState, useContext } from 'react';
import TodoList from '../components/TodoList';
import AddTodoForm from '../components/AddTodoForm';
import { TodoContext } from '../context/TodoContext';

export default function Home() {
  const { todos, addTodo, updateTodo, deleteTodo, toggleComplete } = useContext(TodoContext);

  return (
    <div className="container">
      <h1>Next.js Todo List</h1>
      <AddTodoForm addTodo={addTodo} />
      <TodoList
        todos={todos}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
        toggleComplete={toggleComplete}
      />
    </div>
  );
}

```
