function rankColor(i) {
  return i < 5 ? 'var(--accent)' : '#17B8A6'
}

function PostRow({ p, i }) {
  return (
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
  )
}

export default function TopPosts({ posts }) {
  // 동점 순위 때문에 10개보다 많아질 수 있다(예: 11개, 12개). CSS grid의 auto-flow만으로는
  // 5행을 넘는 순간 새 열(3번째 열)이 하나 더 생겨서 마지막 항목 혼자 떨어져 나가 보이므로,
  // 두 열로 미리 나눠서 렌더링한다 — 왼쪽 열이 남는 하나를 더 받는다(11개 -> 6+5, 12개 -> 6+6).
  const half = Math.ceil(posts.length / 2)
  const left = posts.slice(0, half)
  const right = posts.slice(half)
  return (
    <div className="posts-grid">
      <div className="posts-col">
        {left.map((p, i) => (
          <PostRow p={p} i={i} key={`${p.rank}-${p.title}`} />
        ))}
      </div>
      <div className="posts-col">
        {right.map((p, i) => (
          <PostRow p={p} i={i + half} key={`${p.rank}-${p.title}`} />
        ))}
      </div>
    </div>
  )
}
