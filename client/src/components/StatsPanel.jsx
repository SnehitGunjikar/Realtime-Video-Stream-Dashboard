import React from 'react';

const StatsPanel = ({ total, active }) => {
    return (
        <div className="stats-panel">
            <div className="stat-card">
                <h3>Total Cameras</h3>
                <p>{total}</p>
            </div>
            <div className="stat-card">
                <h3>Active Cameras</h3>
                <p className="active-count">{active}</p>
            </div>
        </div>
    );
};

export default StatsPanel;
