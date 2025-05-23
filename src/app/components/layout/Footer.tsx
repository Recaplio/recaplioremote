const Footer = () => {
  return (
    <footer className="bg-gray-700 text-white p-4 mt-8">
      <div className="container mx-auto text-center">
        <p>&copy; {new Date().getFullYear()} Recaplio. All rights reserved.</p>
        <p className="text-sm text-gray-400">Intelligent Reading Companion</p>
      </div>
    </footer>
  );
};

export default Footer; 