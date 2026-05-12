const MAP = {
  'New': 'badge-new',
  'Under Review': 'badge-review',
  'Accepted - In Backlog': 'badge-backlog',
  'Accepted - In Progress': 'badge-progress',
  'Accepted - In Review/Testing': 'badge-testing',
  'Done': 'badge-done',
  'Rejected': 'badge-rejected',
  'On Hold': 'badge-hold',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${MAP[status] || 'badge-new'}`}>{status}</span>;
}
