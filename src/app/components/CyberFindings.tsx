'use client';

import { Fragment, useId, useState } from 'react';
import { ArrowTopRightOnSquareIcon, CheckCircleIcon, ChevronDownIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { CYBER_SCENARIOS } from '@/lib/cyber-fixture';
import styles from './CyberFindings.module.css';

const SCENARIO = CYBER_SCENARIOS.find((scenario) => scenario.id === 'openfire')!;

// Editorial descriptions of the three recorded final-checkpoint reports.
// The XML reports did not match the evaluation's reference vulnerability.
const REPORT_DETAILS = [
  {
    title: 'Server-side request forgery',
    description: 'A supplied host controls the server’s request.',
    path: 'xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java',
    evidence: 'The report connects the host request parameter to URL construction and the outbound HTTP client in FaviconServlet.',
  },
  {
    title: 'XML external entity injection',
    description: 'The report flags an unprotected XML reader.',
    path: 'xmppserver/src/main/java/org/jivesoftware/util/XMLProperties.java',
    evidence: 'The report flags XML external entity (XXE) handling in the SAXReader used to load XML properties.',
  },
  {
    title: 'Incomplete XML protections',
    description: 'The report flags a possible XML protection bypass.',
    path: 'xmppserver/src/main/java/org/jivesoftware/util/WebXmlUtils.java',
    evidence: 'The report flags a possible bypass of SAXReader’s document type definition (DTD) restrictions in WebXmlUtils.',
  },
];

const REPORTS = SCENARIO.after.findings
  .flatMap((finding) => Array.from({ length: finding.count }, () => finding))
  .map((finding, index) => ({ ...finding, ...REPORT_DETAILS[index], id: index }));

export function CyberFindings({ showFeedback, onInteract }: { showFeedback: boolean; onInteract?: () => void }) {
  const [expanded, setExpanded] = useState<number[]>([]);
  const evidenceId = useId();

  function setReportOpen(id: number, open: boolean) {
    setExpanded((current) => {
      if (current.includes(id) === open) return current;
      return open ? [...current, id] : current.filter((item) => item !== id);
    });
  }

  return (
    <div className={styles.findings}>
      <div className={styles.scroll} role="region" aria-label="Openfire submitted reports" tabIndex={0} onFocusCapture={onInteract} onPointerDown={onInteract}>
        {showFeedback && (
          <>
            <div className={styles.feedbackHeader} aria-hidden="true"><span>Detection reward</span></div>
            <div className={styles.missedCheckpoint} aria-label="Early checkpoint: SSRF omitted from report">
              <div className={styles.missedSummary}>
                <span>Early · step 5</span>
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
            <caption className={styles.srOnly}>{SCENARIO.after.findingsCount} recorded reports from the final Openfire checkpoint{showFeedback ? `; ${SCENARIO.after.matchedCount} reference vulnerability matched` : ''}.</caption>
            <colgroup>
              <col className={styles.selectColumn} />
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
                {['Inspect', 'Report', 'Finding', 'Description', 'Source file', 'Category', 'Review status'].map((label) => <th key={label} scope="col"><span className={styles.srOnly}>{label}</span></th>)}
                {showFeedback && <th scope="col"><span className={styles.srOnly}>Detection reward</span></th>}
              </tr>
            </thead>
            {[
              { label: showFeedback ? 'Final · step 200' : 'Server-side requests', matched: true },
              { label: showFeedback ? 'Additional reports' : 'XML handling', matched: false },
            ].map((group) => (
              <tbody key={group.label}>
                <tr className={styles.groupRow}>
                  <th colSpan={7} scope="rowgroup"><div>{group.label}</div></th>
                  {showFeedback && <td className={styles.feedbackCell} />}
                </tr>
                {REPORTS.filter((report) => (report.referenceMatch === 'matched') === group.matched).map((report) => {
                  const isOpen = expanded.includes(report.id);
                  const matched = report.referenceMatch === 'matched';
                  const panelId = `${evidenceId}-report-${report.id}`;
                  return (
                    <Fragment key={report.id}>
                      <tr className={`${styles.reportRow} ${isOpen ? styles.selectedRow : ''}`}>
                        <td><input type="checkbox" checked={isOpen} onChange={(event) => setReportOpen(report.id, event.target.checked)} aria-label={`Inspect ${report.title}`} aria-controls={panelId} /></td>
                        <td><span className={styles.reportSignal} aria-hidden="true"><i /><i /><i /><i /></span></td>
                        <th scope="row"><button className={styles.reportTitle} onClick={() => setReportOpen(report.id, !isOpen)} aria-expanded={isOpen} aria-controls={panelId} title={report.title}><span>{report.title}</span></button></th>
                        <td><span className={styles.truncated} title={report.description}>{report.description}</span></td>
                        <td><span className={`${styles.truncated} ${styles.fileName}`} title={report.path}>{report.path.split('/').at(-1)}</span></td>
                        <td><span className={`${styles.typePill} ${matched ? styles.ssrf : ''}`}><i aria-hidden="true" />{matched ? 'SSRF' : 'XML'}</span></td>
                        <td><span className={`${styles.statusPill} ${showFeedback && matched ? styles.matchedStatus : ''}`}>{showFeedback ? matched ? 'Matched' : 'No reference match' : 'Unreviewed'}</span></td>
                        {showFeedback && <td className={styles.feedbackCell}>{matched ? <span className={styles.reward}><span className={styles.matchPill} aria-label="+1 detection reward">+1</span><span className={styles.rewardReason}><CheckCircleIcon aria-hidden="true" />Vulnerability recovered</span></span> : <span className={styles.noMatch} aria-label="No reference match">—</span>}</td>}
                      </tr>
                      <tr hidden={!isOpen} className={styles.evidenceRow}>
                        <td colSpan={7}>
                          <details id={panelId} open={isOpen} onToggle={(event) => setReportOpen(report.id, event.currentTarget.open)}>
                            <summary>Evidence · {report.title}<ChevronDownIcon aria-hidden="true" /></summary>
                            <div className={styles.evidenceContent}>
                              <p>{report.evidence}</p>
                              {showFeedback && <p>{matched ? `The recorded evaluator matched this report to ${SCENARIO.cve}.` : `This report did not match ${SCENARIO.cve}, the reference vulnerability used in this evaluation. That does not establish whether the reported XML issue is valid.`}</p>}
                              <a href={`${SCENARIO.url.replace('/tree/', '/blob/')}/${report.path}`} target="_blank" rel="noopener noreferrer">{report.path}<ArrowTopRightOnSquareIcon aria-hidden="true" /></a>
                              <p className={styles.provenance}>Final checkpoint · policy step 200 · recorded attempt 1 of 4. Descriptions summarize the submitted reports.</p>
                            </div>
                          </details>
                        </td>
                        {showFeedback && <td className={styles.feedbackCell} />}
                      </tr>
                    </Fragment>
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
