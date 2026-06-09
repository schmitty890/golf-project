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
        {/* bark body — horizontal log cylinder */}
        <rect x="20" y="18" width="38" height="28" rx="14" fill="#4A2F1B" />
        {/* top highlight + bark grain */}
        <path d="M30 22 H52" stroke="#7A5536" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M34 39 H53" stroke="#3D2716" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
        {/* ember strap wrapping the log */}
        <rect x="43" y="17" width="8" height="30" rx="2.5" fill="#E86A2A" />
        <rect x="49" y="17" width="2" height="30" rx="1" fill="#C9551C" />
        {/* near cut end: dark bark rim + cream ring face */}
        <ellipse cx="22" cy="32" rx="13.5" ry="16.5" fill="#3D2716" />
        <ellipse cx="22" cy="32" rx="12" ry="15" fill="#F4EDE2" />
        {/* growth rings + pith */}
        <ellipse cx="22" cy="32" rx="8" ry="10" fill="none" stroke="#E86A2A" strokeWidth="1.3" opacity="0.28" />
        <ellipse cx="22" cy="32" rx="4.5" ry="5.5" fill="none" stroke="#E86A2A" strokeWidth="1.3" opacity="0.4" />
        <circle cx="22" cy="32" r="1.4" fill="#3D2716" />
        {/* cheeks */}
        <circle cx="14.5" cy="33" r="1.7" fill="#E86A2A" opacity="0.4" />
        <circle cx="29.5" cy="33" r="1.7" fill="#E86A2A" opacity="0.4" />
        {/* eyes (blink target) */}
        <g style={eyeStyle} className={wave ? 'motion-safe:animate-woody-blink' : undefined}>
          <circle cx="18" cy="28" r="2.3" fill="#4A2F1B" />
          <circle cx="26" cy="28" r="2.3" fill="#4A2F1B" />
          <circle cx="18.7" cy="27.3" r="0.8" fill="#FFFFFF" />
          <circle cx="26.7" cy="27.3" r="0.8" fill="#FFFFFF" />
        </g>
        {/* smile */}
        <path d="M16.5 35 Q22 40 27.5 35" stroke="#4A2F1B" strokeWidth="2.2" fill="none" strokeLinecap="round" />
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
