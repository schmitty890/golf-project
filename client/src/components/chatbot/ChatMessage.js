import PropTypes from 'prop-types';

// One chat bubble — bot (left, white) or user echo (right, ember).
function ChatMessage({ from, text }) {
  const isBot = from === 'bot';
  return (
    <div className={isBot ? 'flex' : 'flex justify-end'}>
      <div
        className={
          isBot
            ? 'max-w-[85%] whitespace-pre-line rounded-2xl rounded-tl-sm border border-cream-300 bg-white px-3 py-2 text-sm text-walnut'
            : 'ml-auto max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-ember px-3 py-2 text-sm text-white'
        }
      >
        {text}
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  from: PropTypes.oneOf(['bot', 'user']).isRequired,
  text: PropTypes.string.isRequired,
};

export default ChatMessage;
