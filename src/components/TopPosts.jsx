function rankColor(i) {
  return i < 5 ? 'var(--accent)' : '#17B8A6'
}

export default function TopPosts({ posts }) {
  return (
    <div className="posts-grid">
      {posts.map((p, i) => (
        <div className="post-row" key={`${p.rank}-${p.title}`}>
          <div className="post-rank" style={{ background: rankColor(i) }}>{p.rank}</div>
          <div className="post-title">
            {p.url ? (
              <a href={p.url} target="_blank" rel="noreferrer">
                {p.title}
                <span className="link-ico" title="원문 링크">🔗</span>
              </a>
            ) : (
              p.title
            )}
          </div>
          <div className="post-views">{p.views == null ? '-' : p.views.toLocaleString('ko-KR')}</div>
        </div>
      ))}
    </div>
  )
}
