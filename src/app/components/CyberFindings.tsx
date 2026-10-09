import Image from 'next/image';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { CYBER_SCENARIOS } from '@/lib/cyber-fixture';
import styles from './CyberFindings.module.css';

const SCENARIO = CYBER_SCENARIOS.find((scenario) => scenario.id === 'openfire')!;

// Editorial descriptions of the three recorded final-checkpoint reports.
// The XML reports did not match the evaluation's reference vulnerability.
const REPORT_DETAILS = [
  {
    title: 'Server-side request forgery',
    description: 'A supplied host controls the server’s request.',
    path: 'xmppserver/src/main/java/org/example/util/FaviconServlet.java',
  },
  {
    title: 'XML external entity injection',
    description: 'The report flags an unprotected XML reader.',
    path: 'xmppserver/src/main/java/org/example/util/XMLProperties.java',
  },
  {
    title: 'Incomplete XML protections',
    description: 'The report flags a possible XML protection bypass.',
    path: 'xmppserver/src/main/java/org/example/util/WebXmlUtils.java',
  },
];

const REPORTS = SCENARIO.after.findings
  .flatMap((finding) => Array.from({ length: finding.count }, () => finding))
  .map((finding, index) => ({ ...finding, ...REPORT_DETAILS[index], id: index }));

export function CyberFindings({ showFeedback }: { showFeedback: boolean }) {
  return (
    <div className={styles.findings}>
      <div className={styles.reports} role="region" aria-label="Messaging server submitted reports">
        {showFeedback && (
          <>
            <div className={styles.feedbackHeader} aria-hidden="true"><span>Detection reward</span></div>
            <div className={styles.missedCheckpoint} aria-label="Base Nemotron 3.5 Lightning: SSRF omitted from report">
              <div className={styles.missedSummary}>
                <span className={styles.baseModelLabel}>Base Nemotron 3.5 Lightning</span>
                <strong><XCircleIcon aria-hidden="true" />SSRF omitted from report</strong>
              </div>
              <span className={styles.missedCount} aria-label={`${SCENARIO.before.matchedCount} detection reward`}>
                <strong>{SCENARIO.before.matchedCount}</strong>
              </span>
            </div>
          </>
        )}
        <div className={`${styles.surface} ${showFeedback ? styles.withFeedback : ''}`}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>{SCENARIO.after.findingsCount} recorded reports from the final checkpoint{showFeedback ? `; ${SCENARIO.after.matchedCount} reference vulnerability matched` : ''}.</caption>
            <colgroup>
              <col className={styles.signalColumn} />
              <col className={styles.titleColumn} />
              <col className={styles.descriptionColumn} />
              <col className={styles.fileColumn} />
              <col className={styles.typeColumn} />
              <col className={styles.statusColumn} />
              {showFeedback && <col className={styles.feedbackColumn} />}
            </colgroup>
            <thead>
              <tr>
                {['Report', 'Finding', 'Description', 'Source file', 'Category', 'Review status'].map((label) => <th key={label} scope="col"><span className={styles.srOnly}>{label}</span></th>)}
                {showFeedback && <th scope="col"><span className={styles.srOnly}>Detection reward</span></th>}
              </tr>
            </thead>
            {[
              { label: showFeedback ? 'Post-trained by depthfirst · step 200' : 'Server-side requests', matched: true },
              { label: showFeedback ? 'Additional reports' : 'XML handling', matched: false },
            ].map((group) => (
              <tbody key={group.label}>
                <tr className={styles.groupRow}>
                  <th colSpan={6} scope="rowgroup"><div>{showFeedback && group.matched ? <span className={styles.postTrainedLabel}>Post-trained by <Image src="/cyber/depthfirst.svg" alt="depthfirst" width={205} height={34} /><span>· step 200</span></span> : group.label}</div></th>
                  {showFeedback && <td className={styles.feedbackCell} />}
                </tr>
                {REPORTS.filter((report) => (report.referenceMatch === 'matched') === group.matched).map((report) => {
                  const matched = report.referenceMatch === 'matched';
                  return (
                    <tr key={report.id} className={styles.reportRow}>
                      <td><span className={styles.reportSignal} aria-hidden="true"><i /><i /><i /><i /></span></td>
                      <th scope="row"><span className={styles.truncated} title={report.title}>{report.title}</span></th>
                      <td><span className={styles.truncated} title={report.description}>{report.description}</span></td>
                      <td><span className={`${styles.truncated} ${styles.fileName}`} title={report.path}>{report.path.split('/').at(-1)}</span></td>
                      <td><span className={`${styles.typePill} ${matched ? styles.ssrf : ''}`}><i aria-hidden="true" />{matched ? 'SSRF' : 'XML'}</span></td>
                      <td><span className={`${styles.statusPill} ${showFeedback && matched ? styles.matchedStatus : ''}`}>{showFeedback ? matched ? 'Matched' : 'No reference match' : 'Unreviewed'}</span></td>
                      {showFeedback && <td className={styles.feedbackCell}>{matched ? <span className={styles.reward}><span className={styles.matchPill} aria-label="+1 detection reward">+1</span><span className={styles.rewardReason}><CheckCircleIcon aria-hidden="true" />Vulnerability recovered</span></span> : <span className={styles.noMatch} aria-label="No reference match">—</span>}</td>}
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </div>
  );
}
