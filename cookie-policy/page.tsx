import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy | Stellio',
  description: 'Cookie Policy for Stellio - learn how we use cookies and similar technologies on our website.',
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header */}
      <header className="border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Stellio</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <style>{`
          [data-custom-class='body'], [data-custom-class='body'] * {
            background: transparent !important;
          }
          [data-custom-class='title'], [data-custom-class='title'] * {
            font-family: Arial !important;
            font-size: 26px !important;
            color: #000000 !important;
          }
          [data-custom-class='subtitle'], [data-custom-class='subtitle'] * {
            font-family: Arial !important;
            color: #595959 !important;
            font-size: 14px !important;
          }
          [data-custom-class='heading_1'], [data-custom-class='heading_1'] * {
            font-family: Arial !important;
            font-size: 19px !important;
            color: #000000 !important;
          }
          [data-custom-class='heading_2'], [data-custom-class='heading_2'] * {
            font-family: Arial !important;
            font-size: 17px !important;
            color: #000000 !important;
          }
          [data-custom-class='body_text'], [data-custom-class='body_text'] * {
            color: #595959 !important;
            font-size: 14px !important;
            font-family: Arial !important;
          }
          [data-custom-class='link'], [data-custom-class='link'] * {
            color: #3030F1 !important;
            font-size: 14px !important;
            font-family: Arial !important;
            word-break: break-word !important;
          }
          ul { list-style-type: square; }
          ul > li > ul { list-style-type: circle; }
          ul > li > ul > li > ul { list-style-type: square; }
          ol li { font-family: Arial; }
        `}</style>

        <div data-custom-class="body">
          {/* Title */}
          <div>
            <strong>
              <span style={{ fontSize: 26 }}>
                <span data-custom-class="title">
                  <h1 style={{ margin: '0 0 8px 0' }}>COOKIE POLICY</h1>
                </span>
              </span>
            </strong>
          </div>

          {/* Subtitle */}
          <div>
            <span style={{ color: 'rgb(127, 127, 127)' }}>
              <strong>
                <span style={{ fontSize: 15 }}>
                  <span data-custom-class="subtitle">Last updated March 18, 2026</span>
                </span>
              </strong>
            </span>
          </div>

          <br /><br /><br />

          {/* Intro */}
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">
                This Cookie Policy explains how <strong>Stellio GbR</strong> (&quot;<strong>Company</strong>,&quot; &quot;<strong>we</strong>,&quot; &quot;<strong>us</strong>,&quot; and &quot;<strong>our</strong>&quot;) uses cookies and similar browser storage technologies when you visit our website at{' '}
                <a target="_blank" data-custom-class="link" href="https://stello-jobs.com" rel="noopener noreferrer" style={{ color: 'rgb(0, 58, 250)' }}>https://stello-jobs.com</a>
                {' '}(&quot;<strong>Website</strong>&quot;). It explains what these technologies are, why we use them, and your rights to control them.
              </span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">
                We only use cookies and browser storage that are strictly necessary to operate the Website and provide you with our services. We do <strong>not</strong> use any advertising, analytics, or tracking cookies, and we do not share any data with third parties for advertising purposes.
              </span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* Section 1 */}
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(0, 0, 0)', fontSize: 15 }}>
              <strong>
                <span data-custom-class="heading_1"><h2 style={{ margin: '16px 0 8px 0' }}>What are cookies?</h2></span>
              </strong>
            </span>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">Cookies are small data files placed on your computer or mobile device when you visit a website. We also use related browser storage technologies — <strong>localStorage</strong> and <strong>sessionStorage</strong> — which store data directly in your browser rather than sending it to a server. All storage we use is first-party only (set by us, not by any third party).</span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* Section 2 */}
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(0, 0, 0)', fontSize: 15 }}>
              <strong>
                <span data-custom-class="heading_1"><h2 style={{ margin: '16px 0 8px 0' }}>Why do we use cookies?</h2></span>
              </strong>
            </span>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">We use cookies and browser storage exclusively for the technical operation of the Website — to keep you logged in, to safely handle account sign-up flows, and to remember your preferences. None of the storage described below is used for advertising, profiling, or tracking your activity across other websites.</span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* Section 3 — Cookie Table */}
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(0, 0, 0)', fontSize: 15 }}>
              <strong>
                <span data-custom-class="heading_1"><h2 style={{ margin: '16px 0 8px 0' }}>What cookies and storage do we use?</h2></span>
              </strong>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">The tables below list every cookie and browser storage item we set.</span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* HTTP Cookies heading */}
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(0, 0, 0)', fontSize: 15 }}>
              <strong><span data-custom-class="heading_2">HTTP Cookies</span></strong>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Arial', color: 'rgb(89, 89, 89)' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgb(240, 240, 240)' }}>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Name</th>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Provider</th>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Purpose</th>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Type</th>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}><code>sb-*-auth-token</code></td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Stellio (Supabase)</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Stores your authentication session so you remain logged in between page loads. Set by our authentication provider (Supabase) on our behalf. HTTP-only — not accessible via JavaScript.</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Strictly necessary</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Session / up to 1 week</td>
                </tr>
                <tr style={{ backgroundColor: 'rgb(249, 249, 249)' }}>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}><code>pending_oauth_role</code></td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Stellio</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Temporarily stores the account role (&quot;worker&quot; or &quot;employer&quot;) you selected before being redirected to a third-party OAuth provider (e.g. Google). Deleted immediately after the sign-in completes. HTTP-only — not accessible via JavaScript.</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Strictly necessary</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>5 minutes</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* localStorage heading */}
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(0, 0, 0)', fontSize: 15 }}>
              <strong><span data-custom-class="heading_2">localStorage (persists until cleared)</span></strong>
            </span>
          </div>
          <div style={{ lineHeight: 1.5, marginTop: 6 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">localStorage stores data in your browser indefinitely until you clear it. It is never sent to our servers.</span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Arial', color: 'rgb(89, 89, 89)' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgb(240, 240, 240)' }}>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Key</th>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Purpose</th>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}><code>language</code></td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Remembers your chosen interface language so you see the Website in the same language on your next visit.</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Functional / preference</td>
                </tr>
                <tr style={{ backgroundColor: 'rgb(249, 249, 249)' }}>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}><code>pending_job_application</code></td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Temporarily stores a job listing ID when a worker attempts to apply before their profile is complete, so the application can be resumed after profile setup.</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Strictly necessary</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}><code>profile_tooltip_dismissed</code></td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Records whether you have already dismissed the profile completion tooltip so it is not shown again.</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Functional / UI state</td>
                </tr>
                <tr style={{ backgroundColor: 'rgb(249, 249, 249)' }}>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}><code>employer_hired_ack_&#123;userId&#125;</code></td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Tracks which &quot;candidate hired&quot; notification cards an employer has already acknowledged and dismissed, to avoid showing them again.</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Functional / UI state</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* sessionStorage heading */}
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(0, 0, 0)', fontSize: 15 }}>
              <strong><span data-custom-class="heading_2">sessionStorage (cleared when you close the tab)</span></strong>
            </span>
          </div>
          <div style={{ lineHeight: 1.5, marginTop: 6 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">sessionStorage stores data only for the duration of your current browser tab. It is automatically deleted when you close the tab and is never sent to our servers.</span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Arial', color: 'rgb(89, 89, 89)' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgb(240, 240, 240)' }}>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Key</th>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Purpose</th>
                  <th style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px', textAlign: 'left', color: 'rgb(0,0,0)' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}><code>stellio_pending_phone_role</code></td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Temporarily holds the account role (&quot;worker&quot; or &quot;employer&quot;) during phone/OTP sign-up, since role selection and OTP verification happen in separate steps.</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Strictly necessary</td>
                </tr>
                <tr style={{ backgroundColor: 'rgb(249, 249, 249)' }}>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}><code>pending_offers_modal_dismissed</code></td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Records whether you have dismissed the pending job offers notification modal during this browser session.</td>
                  <td style={{ border: '1px solid rgb(200, 200, 200)', padding: '8px 12px' }}>Functional / UI state</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* Section 4 */}
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(0, 0, 0)', fontSize: 15 }}>
              <strong>
                <span data-custom-class="heading_1"><h2 id="control" style={{ margin: '16px 0 8px 0' }}>How can I control cookies?</h2></span>
              </strong>
            </span>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">Because all cookies and storage we use are strictly necessary or functional, no consent banner is required and there is no opt-out mechanism for individual items — disabling them would prevent core features (such as login) from working.</span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">You can, however, delete or block cookies and browser storage at any time using your browser settings. Please note that doing so will log you out and may prevent some features from working correctly. The following links explain how to manage storage in the most popular browsers:</span>
            </span>
          </div>
          <ul style={{ paddingLeft: '2em', margin: '8px 0' }}>
            <li style={{ lineHeight: 1.5 }}>
              <a data-custom-class="link" href="https://support.google.com/chrome/answer/95647" rel="noopener noreferrer" target="_blank" style={{ color: 'rgb(0, 58, 250)', fontSize: 15 }}>Chrome</a>
            </li>
            <li style={{ lineHeight: 1.5 }}>
              <a data-custom-class="link" href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" rel="noopener noreferrer" target="_blank" style={{ color: 'rgb(0, 58, 250)', fontSize: 15 }}>Firefox</a>
            </li>
            <li style={{ lineHeight: 1.5 }}>
              <a data-custom-class="link" href="https://support.apple.com/en-ie/guide/safari/sfri11471/mac" rel="noopener noreferrer" target="_blank" style={{ color: 'rgb(0, 58, 250)', fontSize: 15 }}>Safari</a>
            </li>
            <li style={{ lineHeight: 1.5 }}>
              <a data-custom-class="link" href="https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd" rel="noopener noreferrer" target="_blank" style={{ color: 'rgb(0, 58, 250)', fontSize: 15 }}>Edge</a>
            </li>
            <li style={{ lineHeight: 1.5 }}>
              <a data-custom-class="link" href="https://help.opera.com/en/latest/web-preferences/" rel="noopener noreferrer" target="_blank" style={{ color: 'rgb(0, 58, 250)', fontSize: 15 }}>Opera</a>
            </li>
          </ul>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* Section 5 */}
          <div style={{ lineHeight: 1.5 }}>
            <strong>
              <span data-custom-class="heading_1"><h2 style={{ margin: '16px 0 8px 0' }}>How often will you update this Cookie Policy?</h2></span>
            </strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">We may update this Cookie Policy from time to time to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please revisit this page regularly to stay informed. The date at the top indicates when it was last updated.</span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          {/* Section 6 */}
          <div style={{ lineHeight: 1.5 }}>
            <strong>
              <span data-custom-class="heading_1"><h2 style={{ margin: '16px 0 8px 0' }}>Where can I get further information?</h2></span>
            </strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">If you have any questions about our use of cookies or browser storage, please contact us at{' '}
                <a target="_blank" data-custom-class="link" href="mailto:jobdeplus49@gmail.com" style={{ color: 'rgb(0, 58, 250)' }}>jobdeplus49@gmail.com</a>
                {' '}or by post to:
              </span>
            </span>
          </div>

          <div style={{ lineHeight: 1.5 }}><br /></div>

          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">Stellio GbR</span>
            </span>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">Germany</span>
            </span>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgb(89, 89, 89)', fontSize: 15 }}>
              <span data-custom-class="body_text">Phone: +49 176 31730210</span>
            </span>
          </div>
        </div>
      </main>

      {/* Simple footer */}
      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-slate-500">
          <p>
            © {new Date().getFullYear()} Stellio GbR. All rights reserved.{' '}
            <Link href="/" className="hover:text-slate-700 transition-colors">Back to Home</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
