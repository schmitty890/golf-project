import PropTypes from 'prop-types';

// Woody — the VOLW Firewood mascot. A friendly log shown cut-end-on, so the
// growth-ring face smiles back at you. Pure inline SVG (brand colors only) so it
// scales crisply at any size and can animate. Swap the artwork here to restyle.
//
// `wave` plays a one-shot wiggle + blink on mount (used when the chat opens).
// Idle motion (the bob) is added by the caller via className, e.g.
//   <Woody className="h-8 w-8 motion-safe:animate-woody-bob" />
const eyeStyle = { transformBox: 'fill-box', transformOrigin: 'center' };
const waveStyle = { transformBox: 'fill-box', transformOrigin: '50% 95%' };

function Woody({ className, title, wave }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <g style={waveStyle} className={wave ? 'motion-safe:animate-woody-wave' : undefined}>
        {/* log depth + bark rim */}
        <circle cx="34" cy="35" r="22" fill="#3D2716" />
        <circle cx="32" cy="32" r="22" fill="#4A2F1B" />
        <path d="M13 27 A22 22 0 0 1 49 23" stroke="#7A5536" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* cut face + growth rings */}
        <circle cx="32" cy="32" r="16.5" fill="#F4EDE2" />
        <circle cx="32" cy="32" r="12" fill="none" stroke="#E86A2A" strokeWidth="1.5" opacity="0.3" />
        <circle cx="32" cy="32" r="7" fill="none" stroke="#E86A2A" strokeWidth="1.5" opacity="0.45" />
        {/* cheeks */}
        <circle cx="22" cy="36" r="2.5" fill="#E86A2A" opacity="0.45" />
        <circle cx="42" cy="36" r="2.5" fill="#E86A2A" opacity="0.45" />
        {/* eyes (blink target) */}
        <g style={eyeStyle} className={wave ? 'motion-safe:animate-woody-blink' : undefined}>
          <circle cx="26" cy="30" r="2.8" fill="#4A2F1B" />
          <circle cx="38" cy="30" r="2.8" fill="#4A2F1B" />
          <circle cx="27" cy="29" r="0.9" fill="#FFFFFF" />
          <circle cx="39" cy="29" r="0.9" fill="#FFFFFF" />
        </g>
        {/* smile */}
        <path d="M25 35 Q32 42 39 35" stroke="#4A2F1B" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
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
