import React, { useState } from 'react';
import axios from 'axios';

const styles = {
  container: {
    maxWidth: '500px',
    margin: '50px auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    textAlign: 'center',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px',
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    outline: 'none',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  successMessage: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    textAlign: 'center',
  },
};

function StringForm() {
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:5001/api/strings', {
        value,
      });

      setMessage('String saved successfully!');
      setValue('');
      // eslint-disable-next-line no-console
      console.log('Response:', response.data);
    } catch (error) {
      setMessage(`Error saving string: ${error.response?.data?.error || error.message}`);
      // eslint-disable-next-line no-console
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Save item</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter a string to save"
          required
          style={styles.input}
        />
        <button type="submit" disabled={isLoading} style={styles.button}>
          {isLoading ? 'Saving...' : 'Save String'}
        </button>
      </form>
      {message && (
        <div style={message.includes('Error') ? styles.errorMessage : styles.successMessage}>
          {message}
        </div>
      )}
    </div>
  );
}

export default StringForm;
