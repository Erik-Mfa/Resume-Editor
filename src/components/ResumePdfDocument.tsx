import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumeData } from '@/lib/resumeSchema'

function buildStyles(fontFamily: string) {
  return StyleSheet.create({
    page: {
      paddingTop: 54,
      paddingBottom: 54,
      paddingLeft: 64,
      paddingRight: 64,
      fontSize: 10,
      fontFamily,
    },
    header: {
      alignItems: 'center',
      marginBottom: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 3,
    },
    contactLine: {
      fontSize: 9,
      marginBottom: 1,
    },
    headerDivider: {
      borderBottomWidth: 1.5,
      borderBottomColor: '#000000',
      marginTop: 6,
      marginBottom: 8,
    },
    sectionHeaderWrap: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#000000',
      paddingTop: 2,
      paddingBottom: 2,
      marginBottom: 6,
      marginTop: 2,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: 700,
      textAlign: 'center',
    },
    section: {
      marginBottom: 10,
    },
    entryBlock: {
      marginBottom: 7,
    },
    entryTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    entryCompany: {
      fontWeight: 700,
      fontSize: 10,
    },
    entryLocation: {
      fontStyle: 'italic',
      fontSize: 10,
    },
    entryBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    entryRole: {
      fontWeight: 700,
      fontSize: 10,
    },
    entryDates: {
      fontSize: 10,
    },
    bullet: {
      marginLeft: 12,
      marginBottom: 2,
      lineHeight: 1.3,
      fontSize: 10,
    },
    bodyText: {
      lineHeight: 1.4,
      fontSize: 10,
    },
    skillsText: {
      textAlign: 'center',
      lineHeight: 1.4,
      fontSize: 10,
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
