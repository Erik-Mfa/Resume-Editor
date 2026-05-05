import { createElement as h } from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumeData } from '@/lib/resumeSchema'

const styles = StyleSheet.create({
  page: {
    paddingTop: 72,
    paddingBottom: 72,
    paddingLeft: 72,
    paddingRight: 72,
    fontSize: 10.5,
    fontFamily: 'Helvetica',
  },
  header: {
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  contactLine: {
    fontSize: 10,
    color: '#333333',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginTop: 8,
    marginBottom: 10,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  jobBlock: {
    marginBottom: 10,
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  jobRole: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
  },
  jobDates: {
    fontSize: 10,
    color: '#555555',
  },
  jobCompany: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 10.5,
    marginBottom: 3,
  },
  bullet: {
    marginLeft: 8,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  bodyText: {
    lineHeight: 1.4,
  },
  educationBlock: {
    marginBottom: 8,
  },
})

interface ResumePdfDocumentProps {
  resumeData: ResumeData
}

export function ResumePdfDocument({ resumeData }: ResumePdfDocumentProps) {
  const { personalInfo, summary, experience, education, skills } = resumeData

  const contactParts = [personalInfo.email, personalInfo.phone, personalInfo.linkedin].filter(
    Boolean
  )

  return h(
    Document,
    null,
    h(
      Page,
      { size: 'LETTER', style: styles.page },

      // Header
      h(
        View,
        { style: styles.header },
        h(Text, { style: styles.name }, personalInfo.name),
        h(Text, { style: styles.contactLine }, contactParts.join('  |  '))
      ),
      h(View, { style: styles.divider }),

      // Professional Summary
      summary
        ? h(
            View,
            { style: styles.section },
            h(Text, { style: styles.sectionHeader }, 'Professional Summary'),
            h(Text, { style: styles.bodyText }, summary)
          )
        : null,

      // Experience
      experience.length > 0
        ? h(
            View,
            { style: styles.section },
            h(Text, { style: styles.sectionHeader }, 'Experience'),
            ...experience.map((entry, i) =>
              h(
                View,
                { key: i, style: styles.jobBlock },
                h(
                  View,
                  { style: styles.jobTitleRow },
                  h(Text, { style: styles.jobRole }, entry.role),
                  h(Text, { style: styles.jobDates }, entry.dates)
                ),
                h(Text, { style: styles.jobCompany }, entry.company),
                ...entry.bullets.map((bullet, j) =>
                  h(Text, { key: j, style: styles.bullet }, '• ' + bullet)
                )
              )
            )
          )
        : null,

      // Education
      education.length > 0
        ? h(
            View,
            { style: styles.section },
            h(Text, { style: styles.sectionHeader }, 'Education'),
            ...education.map((entry, i) =>
              h(
                View,
                { key: i, style: styles.educationBlock },
                h(
                  View,
                  { style: styles.jobTitleRow },
                  h(Text, { style: styles.jobRole }, entry.degree),
                  h(Text, { style: styles.jobDates }, entry.dates)
                ),
                h(Text, { style: styles.jobCompany }, entry.institution)
              )
            )
          )
        : null,

      // Skills
      skills.length > 0
        ? h(
            View,
            { style: styles.section },
            h(Text, { style: styles.sectionHeader }, 'Skills'),
            h(Text, { style: styles.bodyText }, skills.join('  •  '))
          )
        : null
    )
  )
}
