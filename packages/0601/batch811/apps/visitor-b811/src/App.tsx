import React, { useState } from 'react';
import VisitorForm from './forms/VisitorForm';
import PrintTicket from './components/PrintTicket';
import { Visitor } from './services/types';

type AppState = 'form' | 'ticket';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('form');
  const [visitor, setVisitor] = useState<Visitor | null>(null);

  const handleFormSubmit = (newVisitor: Visitor) => {
    setVisitor(newVisitor);
    setState('ticket');
  };

  const handleCloseTicket = () => {
    setVisitor(null);
    setState('form');
  };

  return (
    <div className="kiosk-container">
      <header className="kiosk-header">
        <h1>🏢 访客登记系统</h1>
      </header>

      <main className="kiosk-content">
        {state === 'form' && (
          <VisitorForm onSubmit={handleFormSubmit} />
        )}

        {state === 'ticket' && visitor && (
          <PrintTicket visitor={visitor} onClose={handleCloseTicket} />
        )}
      </main>
    </div>
  );
};

export default App;
