import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumeData } from '@/lib/resumeSchema'

function buildStyles(fontFamily: string) {
  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingLeft: 48,
      paddingRight: 48,
      fontSize: 9,
      fontFamily,
    },
    header: {
      alignItems: 'center',
      marginBottom: 3,
    },
    name: {
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 2,
    },
    contactLine: {
      fontSize: 8.5,
      marginBottom: 1,
    },
    headerDivider: {
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
      marginTop: 4,
      marginBottom: 5,
    },
    sectionHeaderWrap: {
      borderTopWidth: 0.75,
      borderBottomWidth: 0.75,
      borderColor: '#000000',
      paddingTop: 1,
      paddingBottom: 1,
      marginBottom: 4,
      marginTop: 1,
    },
    sectionHeader: {
      fontSize: 10,
      fontWeight: 700,
      textAlign: 'center',
    },
    section: {
      marginBottom: 6,
    },
    entryBlock: {
      marginBottom: 5,
    },
    entryTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    entryCompany: {
      fontWeight: 700,
      fontSize: 9,
      flex: 1,
    },
    entryLocation: {
      fontStyle: 'italic',
      fontSize: 9,
      flexShrink: 0,
      textAlign: 'right',
    },
    entryBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    entryRole: {
      fontWeight: 700,
      fontSize: 9,
      flex: 1,
    },
    entryDates: {
      fontSize: 9,
      flexShrink: 0,
      textAlign: 'right',
    },
    bullet: {
      marginLeft: 10,
      marginBottom: 1,
      lineHeight: 1.25,
      fontSize: 9,
    },
    bodyText: {
      lineHeight: 1.35,
      fontSize: 9,
    },
    skillsText: {
      textAlign: 'center',
      lineHeight: 1.35,
      fontSize: 9,
    },
  })
}

interface ResumePdfDocumentProps {
  resumeData: ResumeData
}

export function ResumePdfDocument({ resumeData }: ResumePdfDocumentProps) {
  const { personalInfo, summary, experience, education, skills } = resumeData
  // fontFamily is pre-registered by export-pdf.ts before renderToBuffer is called
  const fontFamily = resumeData.fontFamily ?? 'Helvetica'
  const styles = buildStyles(fontFamily)

  const contactLine1Parts = [personalInfo.address, personalInfo.email, personalInfo.phone].filter(Boolean)
  const contactLine2Parts = [personalInfo.website, personalInfo.github, personalInfo.linkedin].filter(Boolean)
  const contactLine1 = contactLine1Parts.map((p) => `• ${p}`).join('  ')
  const contactLine2 = contactLine2Parts.map((p) => `• ${p}`).join('  ')

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo.name}</Text>
          {contactLine1 && <Text style={styles.contactLine}>{contactLine1}</Text>}
          {contactLine2 && <Text style={styles.contactLine}>{contactLine2}</Text>}
        </View>
        <View style={styles.headerDivider} />

        {/* Professional Summary */}
        {summary && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeader}>Professional summary</Text>
            </View>
            <Text style={styles.bodyText}>{summary}</Text>
          </View>
        )}

        {/* Education — appears before Experience to match original layout */}
        {education.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeader}>Education</Text>
            </View>
            {education.map((entry, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryTopRow}>
                  <Text style={styles.entryCompany}>{entry.institution}</Text>
                  {entry.location && <Text style={styles.entryLocation}>{entry.location}</Text>}
                </View>
                <View style={styles.entryBottomRow}>
                  <Text style={styles.entryRole}>{entry.degree}</Text>
                  <Text style={styles.entryDates}>{entry.dates}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeader}>Experience</Text>
            </View>
            {experience.map((entry, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryTopRow}>
                  <Text style={styles.entryCompany}>{entry.company}</Text>
                  {entry.location && <Text style={styles.entryLocation}>{entry.location}</Text>}
                </View>
                <View style={styles.entryBottomRow}>
                  <Text style={styles.entryRole}>{entry.role}</Text>
                  <Text style={styles.entryDates}>{entry.dates}</Text>
                </View>
                {entry.bullets.map((bullet, j) => (
                  <Text key={j} style={styles.bullet}>{'• ' + bullet}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeader}>Skills</Text>
            </View>
            <Text style={styles.skillsText}>{'• ' + skills.join(' • ')}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
