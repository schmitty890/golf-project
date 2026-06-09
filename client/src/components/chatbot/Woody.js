import PropTypes from 'prop-types';

// Woody — the VOLW Firewood mascot. Renders the mascot illustration from
// public/woody.png. Kept as a small wrapper so callers control size via
// className and the chat widget has one place to source the mascot.
//
// `wave` plays a one-shot tilt on mount (used when the chat opens). Idle motion
// (the bob) is added by the caller via className, e.g.
//   <Woody className="h-20 w-20 motion-safe:animate-woody-bob" />
const SRC = `${process.env.PUBLIC_URL}/woody.png`;

function Woody({ className, title, wave }) {
  return (
    <img
      src={SRC}
      alt={title || ''}
      aria-hidden={title ? undefined : 'true'}
      draggable="false"
      className={`${className} object-contain ${wave ? 'motion-safe:animate-woody-wave' : ''}`.trim()}
    />
  );
}

Woody.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string,
  wave: PropTypes.bool,
};

Woody.defaultProps = {
  className: '',
  title: '',
  wave: false,
};

export default Woody;
