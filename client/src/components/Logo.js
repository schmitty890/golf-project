import PropTypes from 'prop-types';
import logo from '../assets/volw-logo-circle.png';

// VOLW Firewood logo — the round badge (name baked into the artwork).
// Uses the processed asset whose exterior background is transparent, so it sits
// cleanly on any background with no white ring.
function Logo({ size = 'md', className = '' }) {
  const dim = {
    sm: 'h-14 w-14',
    md: 'h-24 w-24',
    lg: 'h-44 w-44',
    xl: 'h-36 w-36',
  }[size];

  return (
    <img
      src={logo}
      alt="VOLW Firewood"
      className={`${dim} shrink-0 object-contain ${className}`}
    />
  );
}

Logo.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

Logo.defaultProps = {
  size: 'md',
  className: '',
};

export default Logo;
