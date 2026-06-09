import PropTypes from 'prop-types';

// The stack of quick-action buttons for the current node.
function ChatChoices({ options, onChoose }) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChoose(option)}
          className={
            option.cta
              ? 'w-full rounded-xl bg-ember px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ember-600'
              : 'w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-left text-sm font-semibold text-walnut transition-colors hover:border-ember'
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

ChatChoices.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    cta: PropTypes.bool,
  })).isRequired,
  onChoose: PropTypes.func.isRequired,
};

export default ChatChoices;
