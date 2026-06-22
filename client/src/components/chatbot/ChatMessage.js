import PropTypes from 'prop-types';

// One chat bubble — bot (left, white), agent/owner (left, ember-accented), or user (right, ember).
function ChatMessage({ from, text }) {
  const isUser = from === 'user';
  const base = 'max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm';
  let bubble;
  if (isUser) {
    bubble = `ml-auto ${base} rounded-tr-sm bg-ember text-white`;
  } else if (from === 'agent') {
    bubble = `${base} rounded-tl-sm border border-ember/40 bg-white text-walnut`;
  } else {
    bubble = `${base} rounded-tl-sm border border-cream-300 bg-white text-walnut`;
  }
  return (
    <div className={isUser ? 'flex justify-end' : 'flex'}>
      <div className={bubble}>{text}</div>
    </div>
  );
}

ChatMessage.propTypes = {
  from: PropTypes.oneOf(['bot', 'user', 'agent']).isRequired,
  text: PropTypes.string.isRequired,
};

export default ChatMessage;
