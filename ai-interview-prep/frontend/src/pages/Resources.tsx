import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import styles from './Resources.module.css'

interface Article {
  id: string
  title: string
  category: string
  excerpt: string
  readTime: string
  content: string[]
}

const ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Mastering the STAR Method for Behavioral Interviews',
    category: 'Behavioral',
    excerpt: 'Learn how to structure your answers using Situation, Task, Action, and Result for behavioral rounds.',
    readTime: '5 min read',
    content: [
      'Behavioral interviews are designed to determine how you handle situations at work. The most effective way to answer these questions is using the STAR framework: Situation, Task, Action, and Result.',
      'SITUATION: Set the scene and give necessary details of your example. What was the context?',
      'TASK: Describe what your responsibility was in that situation. What goal were you working toward?',
      'ACTION: Explain exactly what steps you took to address the challenge. Focus on your actions, not just the team.',
      'RESULT: Share what outcomes were achieved. Whenever possible, quantify the results (e.g. improved performance by 20%).'
    ]
  },
  {
    id: 'art-2',
    title: 'System Design 101: Designing Scalable Architecture',
    category: 'System Design',
    excerpt: 'An introduction to key concepts like load balancing, database scaling, caching, and rate limiting.',
    readTime: '8 min read',
    content: [
      'System design rounds test your ability to design robust, scalable systems that can handle high traffic volumes.',
      'Load Balancers distribute incoming traffic across multiple servers to prevent any single server from becoming a bottleneck.',
      'Caching stores frequently accessed data in memory (like Redis or Memcached) to reduce load on databases and speed up response times.',
      'Database Scaling can be achieved horizontally (sharding) or vertically (adding resources). Choosing the right approach depends on read/write patterns.'
    ]
  },
  {
    id: 'art-3',
    title: 'Dynamic Programming: A Guide to Optimizing Algorithms',
    category: 'Algorithms',
    excerpt: 'Understand memoization, tabulation, and how to break down complex DP problems with ease.',
    readTime: '10 min read',
    content: [
      'Dynamic Programming (DP) is a method for solving complex problems by breaking them down into simpler subproblems.',
      'The core idea of DP is to avoid redundant calculations. If you solve a subproblem, store its result.',
      'MEMOIZATION (Top-Down): Solve the problem recursively and cache the results of subproblems.',
      'TABULATION (Bottom-Up): Solve subproblems first and store results in a table (usually an array), building up to the main problem.'
    ]
  }
]

export default function Resources() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Resources & Guides</h1>
        <p className={styles.subtitle}>Curated articles, tips, and techniques to scale up your interview game.</p>
      </div>

      {selectedArticle ? (
        <div className={styles.detailContainer}>
          <div className={styles.detailHeader}>
            <span className={styles.category}>{selectedArticle.category}</span>
            <h2 className={styles.detailTitle}>{selectedArticle.title}</h2>
            <span className={styles.readTime}>{selectedArticle.readTime}</span>
          </div>
          <div className={styles.detailBody}>
            {selectedArticle.content.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() => setSelectedArticle(null)}
            style={{ marginTop: 'var(--space-6)' }}
          >
            ← Back to Resources
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {ARTICLES.map((art) => (
            <Card
              key={art.id}
              className={styles.articleCard}
              onClick={() => setSelectedArticle(art)}
            >
              <div className={styles.cardTop}>
                <span className={styles.category}>{art.category}</span>
                <h3 className={styles.articleTitle}>{art.title}</h3>
                <p className={styles.excerpt}>{art.excerpt}</p>
              </div>
              <div className={styles.cardBottom}>
                <span className={styles.readTime}>{art.readTime}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedArticle(art)}
                >
                  Read →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
