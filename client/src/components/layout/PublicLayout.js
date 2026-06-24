import PropTypes from 'prop-types';
import AnnouncementBar from './AnnouncementBar';
import PublicHeader from './PublicHeader';
import Footer from './Footer';
import RushBanner from '../RushBanner';

function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <RushBanner />
      <AnnouncementBar />
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

PublicLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PublicLayout;
