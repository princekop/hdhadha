```javascript
import React, { useContext } from 'react';
import TodoItem from './TodoItem';
import { TodoContext } from '../pages/index';

const TodoList = () => {
  const { todos, toggleComplete, deleteTodo, updateTodo } = useContext(TodoContext);

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          toggleComplete={toggleComplete}
          deleteTodo={deleteTodo}
          updateTodo={updateTodo}
        />
      ))}
    </ul>
  );
};

export default TodoList;
```
