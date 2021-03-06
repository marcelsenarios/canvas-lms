/*
 * Copyright (C) 2017 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {Component} from 'react'
import {connect} from 'react-redux'
import {arrayOf, func, shape, string} from 'prop-types'
import I18n from 'i18n!gradebook_history'
import tz from 'timezone'
import moment from 'moment'
import {Checkbox} from '@instructure/ui-checkbox'
import {Select} from '@instructure/ui-forms'
import {Button} from '@instructure/ui-buttons'
import {View, Grid} from '@instructure/ui-layout'
import {FormFieldGroup} from '@instructure/ui-form-field'
import {ScreenReaderContent} from '@instructure/ui-a11y'
import SearchFormActions from './actions/SearchFormActions'
import {showFlashAlert} from '../shared/FlashAlert'
import environment from './environment'
import CanvasDateInput from 'jsx/shared/components/CanvasDateInput'

const recordShape = shape({
  fetchStatus: string.isRequired,
  items: arrayOf(
    shape({
      id: string.isRequired,
      name: string.isRequired
    })
  ),
  nextPage: string.isRequired
})

const formatDate = date => tz.format(date, 'date.formats.medium_with_weekday')

class SearchFormComponent extends Component {
  static propTypes = {
    fetchHistoryStatus: string.isRequired,
    assignments: recordShape.isRequired,
    graders: recordShape.isRequired,
    students: recordShape.isRequired,
    getGradebookHistory: func.isRequired,
    clearSearchOptions: func.isRequired,
    getSearchOptions: func.isRequired,
    getSearchOptionsNextPage: func.isRequired
  }

  state = {
    selected: {
      assignment: '',
      grader: '',
      student: '',
      from: {value: '', conversionFailed: false},
      to: {value: '', conversionFailed: false},
      showFinalGradeOverridesOnly: false
    },
    messages: {
      assignments: I18n.t('Type a few letters to start searching'),
      graders: I18n.t('Type a few letters to start searching'),
      students: I18n.t('Type a few letters to start searching')
    }
  }

  componentDidMount() {
    this.props.getGradebookHistory(this.state.selected)
  }

  UNSAFE_componentWillReceiveProps({fetchHistoryStatus, assignments, graders, students}) {
    if (this.props.fetchHistoryStatus === 'started' && fetchHistoryStatus === 'failure') {
      showFlashAlert({message: I18n.t('Error loading gradebook history. Try again?')})
    }

    if (assignments.fetchStatus === 'success' && assignments.items.length === 0) {
      this.setState(prevState => ({
        messages: {
          ...prevState.messages,
          assignments: I18n.t('No artifacts with that name found')
        }
      }))
    }
    if (graders.fetchStatus === 'success' && !graders.items.length) {
      this.setState(prevState => ({
        messages: {
          ...prevState.messages,
          graders: I18n.t('No graders with that name found')
        }
      }))
    }
    if (students.fetchStatus === 'success' && !students.items.length) {
      this.setState(prevState => ({
        messages: {
          ...prevState.messages,
          students: I18n.t('No students with that name found')
        }
      }))
    }
    if (assignments.nextPage) {
      this.props.getSearchOptionsNextPage('assignments', assignments.nextPage)
    }
    if (graders.nextPage) {
      this.props.getSearchOptionsNextPage('graders', graders.nextPage)
    }
    if (students.nextPage) {
      this.props.getSearchOptionsNextPage('students', students.nextPage)
    }
  }

  setSelectedFrom = from => {
    const conversionFailed = !from
    const value = conversionFailed
      ? null
      : moment(from)
          .startOf('day')
          .toISOString()
    this.setState(prevState => ({
      selected: {
        ...prevState.selected,
        from: {value, conversionFailed}
      }
    }))
  }

  setSelectedTo = to => {
    const conversionFailed = !to
    const value = conversionFailed
      ? null
      : moment(to)
          .endOf('day')
          .toISOString()
    this.setState(prevState => ({
      selected: {
        ...prevState.selected,
        to: {value, conversionFailed}
      }
    }))
  }

  setSelectedAssignment = (event, selectedOption) => {
    this.props.clearSearchOptions('assignments')
    this.setState(prevState => {
      const selected = {
        ...prevState.selected,
        assignment: selectedOption ? selectedOption.id : ''
      }

      // If we selected an assignment, uncheck the "show final grade overrides
      // only" checkbox
      if (selectedOption != null) {
        selected.showFinalGradeOverridesOnly = false
      }

      return {selected}
    })
  }

  setSelectedGrader = (event, selected) => {
    this.props.clearSearchOptions('graders')
    this.setState(prevState => ({
      selected: {
        ...prevState.selected,
        grader: selected ? selected.id : ''
      }
    }))
  }

  setSelectedStudent = (event, selected) => {
    this.props.clearSearchOptions('students')
    this.setState(prevState => ({
      selected: {
        ...prevState.selected,
        student: selected ? selected.id : ''
      }
    }))
  }

  hasToBeforeFrom() {
    return (
      moment(this.state.selected.from.value).diff(
        moment(this.state.selected.to.value),
        'seconds'
      ) >= 0
    )
  }

  hasDateInputErrors() {
    return (
      this.dateInputErrors().length > 0 ||
      this.state.selected.from.conversionFailed ||
      this.state.selected.to.conversionFailed
    )
  }

  dateInputErrors = () => {
    if (this.hasToBeforeFrom()) {
      return [
        {
          type: 'error',
          text: I18n.t("'From' date must be before 'To' date")
        }
      ]
    }

    return []
  }

  promptUserEntry = () => {
    const emptyMessage = I18n.t('Type a few letters to start searching')
    this.setState({
      messages: {
        assignments: emptyMessage,
        graders: emptyMessage,
        students: emptyMessage
      }
    })
  }

  handleAssignmentChange = (_event, value) => {
    this.handleSearchEntry('assignments', value)
  }

  handleGraderChange = (_event, value) => {
    this.handleSearchEntry('graders', value)
  }

  handleStudentChange = (_event, value) => {
    this.handleSearchEntry('students', value)
  }

  handleShowFinalGradeOverridesOnlyChange = _event => {
    const enabled = !this.state.selected.showFinalGradeOverridesOnly

    if (enabled) {
      // If we checked the checkbox, clear any assignments we were filtering by
      this.props.clearSearchOptions('assignments')
    }

    this.setState(
      prevState => ({
        selected: {
          ...prevState.selected,
          assignment: enabled ? '' : prevState.selected.assignment,
          showFinalGradeOverridesOnly: enabled
        }
      }),
      () => {
        if (enabled) {
          // Also manually clear the contents of the assignment select input
          this.assignmentInput.value = ''
        }
      }
    )
  }

  handleSearchEntry = (target, searchTerm) => {
    if (searchTerm.length <= 2) {
      if (this.props[target].items.length > 0) {
        this.props.clearSearchOptions(target)
        this.promptUserEntry()
      }

      return
    }

    this.props.getSearchOptions(target, searchTerm)
  }

  handleSubmit = () => {
    this.props.getGradebookHistory(this.state.selected)
  }

  filterNone = options =>
    // empty function here as the default filter function for Select
    // does a startsWith call, and won't match `nora` -> `Elenora` for example
    options

  renderAsOptions = data =>
    data.map(item => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    ))

  render() {
    return (
      <View as="div" margin="0 0 xx-large">
        <Grid>
          <Grid.Row>
            <Grid.Col>
              <FormFieldGroup
                description={<ScreenReaderContent>{I18n.t('Search Form')}</ScreenReaderContent>}
                as="div"
                layout="columns"
                colSpacing="small"
                vAlign="top"
                startAt="large"
              >
                <FormFieldGroup
                  description={<ScreenReaderContent>{I18n.t('Users')}</ScreenReaderContent>}
                  as="div"
                  layout="columns"
                  vAlign="top"
                  startAt="medium"
                >
                  <Select
                    editable
                    id="students"
                    allowEmpty
                    emptyOption={this.state.messages.students}
                    filter={this.filterNone}
                    label={I18n.t('Student')}
                    loadingText={
                      this.props.students.fetchStatus === 'started'
                        ? I18n.t('Loading Students')
                        : undefined
                    }
                    onBlur={this.promptUserEntry}
                    onChange={this.setSelectedStudent}
                    onInputChange={this.handleStudentChange}
                  >
                    {this.renderAsOptions(this.props.students.items)}
                  </Select>
                  <Select
                    editable
                    id="graders"
                    allowEmpty
                    emptyOption={this.state.messages.graders}
                    filter={this.filterNone}
                    label={I18n.t('Grader')}
                    loadingText={
                      this.props.graders.fetchStatus === 'started'
                        ? I18n.t('Loading Graders')
                        : undefined
                    }
                    onBlur={this.promptUserEntry}
                    onChange={this.setSelectedGrader}
                    onInputChange={this.handleGraderChange}
                  >
                    {this.renderAsOptions(this.props.graders.items)}
                  </Select>
                  <Select
                    editable
                    id="assignments"
                    allowEmpty
                    emptyOption={this.state.messages.assignments}
                    filter={this.filterNone}
                    inputRef={ref => {
                      this.assignmentInput = ref
                    }}
                    label={I18n.t('Artifact')}
                    loadingText={
                      this.props.assignments.fetchStatus === 'started'
                        ? I18n.t('Loading Artifact')
                        : undefined
                    }
                    onBlur={this.promptUserEntry}
                    onChange={this.setSelectedAssignment}
                    onInputChange={this.handleAssignmentChange}
                  >
                    {this.renderAsOptions(this.props.assignments.items)}
                  </Select>
                </FormFieldGroup>

                <FormFieldGroup
                  description={<ScreenReaderContent>{I18n.t('Dates')}</ScreenReaderContent>}
                  layout="columns"
                  startAt="small"
                  vAlign="top"
                  messages={this.dateInputErrors()}
                >
                  <CanvasDateInput
                    renderLabel={I18n.t('Start Date')}
                    formatDate={formatDate}
                    selectedDate={this.state.selected.from.value}
                    onSelectedDateChange={this.setSelectedFrom}
                    withRunningValue
                  />
                  <CanvasDateInput
                    renderLabel={I18n.t('End Date')}
                    formatDate={formatDate}
                    selectedDate={this.state.selected.to.value}
                    onSelectedDateChange={this.setSelectedTo}
                    withRunningValue
                  />
                </FormFieldGroup>
              </FormFieldGroup>
            </Grid.Col>
            <Grid.Col width="auto">
              <div style={{margin: '1.9rem 0 0 0'}}>
                <Button
                  onClick={this.handleSubmit}
                  type="submit"
                  variant="primary"
                  disabled={this.hasDateInputErrors()}
                >
                  {I18n.t('Filter')}
                </Button>
              </div>
            </Grid.Col>
          </Grid.Row>

          {environment.overrideGradesEnabled() && (
            <Grid.Row>
              <Grid.Col>
                <FormFieldGroup
                  as="div"
                  description={
                    <ScreenReaderContent>
                      {I18n.t('Show Final Grade Overrides Only')}
                    </ScreenReaderContent>
                  }
                  layout="columns"
                  startAt="small"
                  vAlign="top"
                >
                  <Checkbox
                    checked={this.state.selected.showFinalGradeOverridesOnly}
                    id="show_final_grade_overrides_only"
                    label={I18n.t('Show Final Grade Overrides Only')}
                    onChange={this.handleShowFinalGradeOverridesOnlyChange}
                  />
                </FormFieldGroup>
              </Grid.Col>
            </Grid.Row>
          )}
        </Grid>
      </View>
    )
  }
}

const mapStateToProps = state => ({
  fetchHistoryStatus: state.history.fetchHistoryStatus || '',
  assignments: {
    fetchStatus: state.searchForm.records.assignments.fetchStatus || '',
    items: state.searchForm.records.assignments.items || [],
    nextPage: state.searchForm.records.assignments.nextPage || ''
  },
  graders: {
    fetchStatus: state.searchForm.records.graders.fetchStatus || '',
    items: state.searchForm.records.graders.items || [],
    nextPage: state.searchForm.records.graders.nextPage || ''
  },
  students: {
    fetchStatus: state.searchForm.records.students.fetchStatus || '',
    items: state.searchForm.records.students.items || [],
    nextPage: state.searchForm.records.students.nextPage || ''
  }
})

const mapDispatchToProps = dispatch => ({
  getGradebookHistory: input => {
    dispatch(SearchFormActions.getGradebookHistory(input))
  },
  getSearchOptions: (recordType, searchTerm) => {
    dispatch(SearchFormActions.getSearchOptions(recordType, searchTerm))
  },
  getSearchOptionsNextPage: (recordType, url) => {
    dispatch(SearchFormActions.getSearchOptionsNextPage(recordType, url))
  },
  clearSearchOptions: recordType => {
    dispatch(SearchFormActions.clearSearchOptions(recordType))
  }
})

export default connect(mapStateToProps, mapDispatchToProps)(SearchFormComponent)

export {SearchFormComponent}
