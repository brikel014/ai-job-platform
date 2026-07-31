import Image from 'next/image'
import Link from 'next/link'

export default function AuraProgramPage() {
  return (
    <>
      {/* NAV */}
      <header className="nav">
        <div className="wrap inner">
          <a className="brand" href="#top">Aura x Stellio</a>
          <div className="nav-right">
            <span className="nav-meta">Non-profit · For women</span>
            <Link className="btn btn-primary" href="/aura/apply">Apply now</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <span id="top" />
      <section className="hero">
        <div className="aura-grain" />
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-text">
              <p className="eyebrow">A non-profit for women · Paid vocational training</p>
              <h1><span className="gold">Build</span> a future<br />that belongs to you.</h1>
              <p className="lead">
                Aura helps women train as professional massage and physiotherapy practitioners —
                paid to learn, fully supported, with no experience needed to begin.
              </p>
              <div className="hero-cta">
                <Link className="btn btn-sage" href="/aura/apply">Apply to join →</Link>
                <a className="btn btn-ghost btn-lg" href="#how">See how it works</a>
              </div>
              <div className="hero-trust">
                <span>Safe</span><i className="dot" /><span>Professional</span><i className="dot" /><span>Never exploited</span>
              </div>
            </div>
            <div className="hero-photo">
              <Image
                src="/aura/spa-prepare.jpg"
                alt="A calm massage therapist preparing a treatment room"
                fill
                priority
                sizes="(max-width: 860px) 100vw, 50vw"
                style={{ objectFit: 'cover', objectPosition: '72% 50%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="strip">
        <div className="wrap">
          <div className="row">
            <div className="cell">
              <div className="k">WHO IS AURA</div>
              <div className="v">A non-profit organisation — not an agency. We exist to help women learn.</div>
            </div>
            <div className="cell">
              <div className="k">What it costs you</div>
              <div className="v">Your own accommodation — but you&apos;re paid to train, receive a monthly subsidy, and we help you find a place to live.</div>
            </div>
            <div className="cell">
              <div className="k">What you become</div>
              <div className="v">A qualified, recognised massage &amp; physiotherapy professional.</div>
            </div>
            <div className="cell">
              <div className="k">No experience</div>
              <div className="v">You start from zero. Teaching you is the entire point.</div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT AURA IS */}
      <section className="block" id="about">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow clay">What Aura is</p>
            <h2>One trusted pathway, built from many trusted partners.</h2>
            <p>
              Aura is a non-profit platform that connects everything a woman needs to change her
              life — in one safe, coordinated route. It brings together the partners who recruit,
              the schools who teach, and the clinics where you practise, so you never have to
              navigate it alone.
            </p>
          </div>
          <div className="eco">
            <div className="node">
              <div className="num">01</div>
              <div className="ttl">Recruitment partners</div>
              <p>Trusted partners help us find motivated women and guide your very first steps — honestly, with no pressure and no fees.</p>
              <div className="arrow" />
            </div>
            <div className="node">
              <div className="num">02</div>
              <div className="ttl">Vocational schools</div>
              <p>Accredited Dutch training providers teach you massage therapy and physiotherapy as a recognised, three-year qualification.</p>
              <div className="arrow" />
            </div>
            <div className="node">
              <div className="num">03</div>
              <div className="ttl">Clinics &amp; spas</div>
              <p>Real clinics give you supervised, hands-on practice — so you graduate with genuine experience, not just a certificate.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section className="block dark">
        <div className="wrap">
          <div className="safety">
            <div className="safety-photo">
              <Image
                src="/aura/wellness-treatment.jpg"
                alt="A professional massage therapy treatment in a calm clinic"
                fill
                sizes="(max-width: 820px) 100vw, 45vw"
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div>
              <p className="eyebrow gold">A CLEAR SAFE PATHWAY FOR WOMEN</p>
              <h2>A regulated healthcare profession. Nothing else.</h2>
              <ul className="promise">
                <li>
                  <span className="mk">✓</span>
                  <div className="pt">
                    <strong>This is therapeutic massage and physiotherapy</strong>
                    <span>A recognised medical-wellness profession within Dutch vocational education.</span>
                  </div>
                </li>
                <li>
                  <span className="mk">✓</span>
                  <div className="pt">
                    <strong>You are never exploited</strong>
                    <span>No debt, no hidden fees, no contract that traps you. Your salary and subsidy are yours to keep — support, not a loan you owe back.</span>
                  </div>
                </li>
                <li>
                  <span className="mk">✓</span>
                  <div className="pt">
                    <strong>You are supported by people, not processed</strong>
                    <span>A real mentor walks with you from your first week to your own clinic. You can ask anything, any time.</span>
                  </div>
                </li>
                <li>
                  <span className="mk">✓</span>
                  <div className="pt">
                    <strong>Your independence is the goal</strong>
                    <span>Everything we do is designed to leave you qualified, confident, and free to build your own practice.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PATHWAY (3 years) */}
      <section className="block" id="how">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow sage">The three-year pathway</p>
            <h2>From your first skill to your own clinic.</h2>
            <p>The programme is a full three-year Dutch vocational training, structured in three clear stages so progress always feels steady and possible.</p>
          </div>
          <div className="path">
            <div className="step">
              <div className="head"><span className="n">01</span><span className="tile tile-sage">✓</span></div>
              <div className="yr yr-sage">Year 1 · Learn</div>
              <div className="ttl">Learning</div>
              <p>You learn practical massage and physiotherapy skills, anatomy, hygiene, and professional service standards — from the very beginning, no prior knowledge assumed.</p>
            </div>
            <div className="step">
              <div className="head"><span className="n">02</span><span className="tile tile-clay">✓</span></div>
              <div className="yr yr-clay">Year 2 · Practice</div>
              <div className="ttl">Training</div>
              <p>You practise in real clinics under supervision, building confidence and real client experience — earning your monthly salary and subsidy as you go.</p>
            </div>
            <div className="step">
              <div className="head"><span className="n">03</span><span className="tile tile-gold">✓</span></div>
              <div className="yr yr-gold">Year 3 · Build</div>
              <div className="ttl">Launch</div>
              <p>You qualify, then we help you open your own massage and spa clinic — anywhere in Europe you choose — with guidance on setup, admin, and first clients.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FUNDING */}
      <section className="block alt">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow gold">What you receive</p>
            <h2>You focus on learning. You&apos;re paid while you do it.</h2>
            <p>Money should never be the reason a woman can&apos;t change her life. The training is paid work, with a monthly subsidy on top — and we help you find a place to live.</p>
          </div>
          <div className="fund">
            <div className="stat">
              <div className="num">€1,500<small> /mo</small></div>
              <div className="cap">Monthly salary</div>
              <div className="ex">The training is paid work — you earn around €1,500 per month (brutto) for what you do.</div>
            </div>
            <div className="stat">
              <div className="num">€1,000<small> /mo</small></div>
              <div className="cap">Monthly subsidy</div>
              <div className="ex">On top of your salary, a €1,000 monthly subsidy (brutto) so you can train without financial stress.</div>
            </div>
            <div className="stat">
              <div className="num">Housing</div>
              <div className="cap">We help you find it</div>
              <div className="ex">Accommodation isn&apos;t free, but Aura helps you find a safe, affordable place near your training — so you&apos;re not searching alone.</div>
            </div>
          </div>
          <p className="fund-note">All amounts are gross (brutto). Your salary and subsidy are yours — support, not a loan, with nothing to pay back.</p>
        </div>
      </section>

      {/* JOURNEY / FLOW */}
      <section className="block">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow clay">Your journey, step by step</p>
            <h2>Every stage has a person, a standard, and a next step.</h2>
          </div>
          <div className="journey">
            <div className="j first"><div className="num">01</div><span className="tag tag-clay">First contact</span><p>You apply and we have a warm, no-pressure conversation about your goals.</p></div>
            <div className="j"><div className="num">02</div><span className="tag tag-clay">Getting to know you</span><p>We check fit — your motivation, reliability, and readiness to learn.</p></div>
            <div className="j"><div className="num">03</div><span className="tag tag-clay">Preparation</span><p>We help with documents, status, and everything needed to begin in the Netherlands.</p></div>
            <div className="j"><div className="num">04</div><span className="tag tag-sage">Arrival &amp; housing</span><p>We help you find accommodation and give you a proper orientation on arrival — you are settled, not dropped.</p></div>
            <div className="j first"><div className="num">05</div><span className="tag tag-sage">Training begins</span><p>You start the accredited three-year programme at a partner school.</p></div>
            <div className="j"><div className="num">06</div><span className="tag tag-sage">Supervised practice</span><p>You practise in real clinics with mentors beside you.</p></div>
            <div className="j"><div className="num">07</div><span className="tag tag-gold">Qualification</span><p>You graduate as a recognised massage and physiotherapy professional.</p></div>
            <div className="j"><div className="num">08</div><span className="tag tag-gold">Your own clinic</span><p>We help you open your practice anywhere in Europe you choose.</p></div>
          </div>
        </div>
      </section>

      {/* WHO / AFTER */}
      <section className="block alt">
        <div className="wrap">
          <div className="two">
            <div>
              <p className="eyebrow sage">Who this is for</p>
              <h2>We are looking for</h2>
              <ul className="who-list">
                <li><span className="n">01</span><span className="tx"><strong>Women aged 22–55</strong> who want a real profession and real independence.</span></li>
                <li><span className="n">02</span><span className="tx"><strong>No experience required</strong> — teaching you from the start is the whole purpose.</span></li>
                <li><span className="n">03</span><span className="tx"><strong>A working knowledge of English</strong> — enough to follow training and communicate with clients and mentors.</span></li>
                <li><span className="n">04</span><span className="tx"><strong>EU citizenship, or a valid visa</strong> to live and train in the Netherlands.</span></li>
                <li><span className="n">05</span><span className="tx"><strong>Willing to train in the Netherlands</strong> for the programme, with our full support.</span></li>
              </ul>
            </div>
            <div className="after-card">
              <Image
                src="/aura/independent-woman.jpg"
                alt="A confident, independent woman in her own wellness studio"
                fill
                sizes="(max-width: 820px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
              <div className="ov" />
              <div className="cap">
                <p className="eyebrow ondark">After you qualify</p>
                <h3>Open your own clinic, anywhere in Europe.</h3>
                <p>You finish as the owner of your future — free to build a massage and spa practice in the city and country you choose.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="block">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow clay">Honest answers</p>
            <h2>Questions women ask us.</h2>
          </div>
          <div className="faq">
            <details open>
              <summary>Do I really need no experience?<span className="pm" /></summary>
              <p>Correct. Aura exists to educate women from the very beginning. You do not need any background in massage, physiotherapy, or healthcare — the programme teaches you everything, step by step.</p>
            </details>
            <details>
              <summary>How does the money work?<span className="pm" /></summary>
              <p>The training is paid work: you earn around €1,500 per month, plus a €1,000 monthly subsidy on top — all amounts gross (brutto). Accommodation isn&apos;t free, but we help you find a place to live. Your salary and subsidy are yours to keep — this is support, not a loan, so there is nothing to pay back.</p>
            </details>
            <details>
              <summary>Is this a safe and professional programme?<span className="pm" /></summary>
              <p>Yes, completely. This is regulated therapeutic massage and physiotherapy — a recognised healthcare profession within Dutch vocational education.</p>
            </details>
            <details>
              <summary>What qualification do I earn?<span className="pm" /></summary>
              <p>You complete a three-year Dutch vocational training and graduate as a recognised, professional massage and physiotherapy practitioner — with both classroom learning and supervised clinical experience.</p>
            </details>
            <details>
              <summary>What happens after the three years?<span className="pm" /></summary>
              <p>Aura helps you open your own massage and spa clinic anywhere in Europe you wish — with practical guidance on setting up, administration, and finding your first clients.</p>
            </details>
            <details>
              <summary>Where will I live and train?<span className="pm" /></summary>
              <p>The vocational training starts in Rotterdam, at accredited partner schools and clinics, and Aura helps you find safe, affordable accommodation for the duration of your training.</p>
            </details>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="aura-wash" />
        <div className="wrap inner">
          <p className="eyebrow gold">Your first step</p>
          <h2>Start your application today.</h2>
          <p>It takes a few minutes. There&apos;s no cost, no obligation — just a conversation about the future you want to build.</p>
          <div className="cta">
            <Link className="btn btn-gold" href="/aura/apply">Apply to join Aura →</Link>
            <a className="btn btn-ghost btn-lg ondark" href="#about">Read it again</a>
          </div>
          <div className="pills">
            <span className="pill tag-sage on-sage">Learn</span>
            <span className="pill tag-clay on-sage">Practice</span>
            <span className="pill tag-gold">Launch</span>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap inner">
          <span className="brand">Aura Europe</span>
          <span className="meta">Non-profit · For women building independent futures</span>
          <span className="meta">In partnership with Stellio</span>
        </div>
      </footer>
    </>
  )
}
