import React, { useState, useReducer } from 'react'
import _ from 'lodash'
import styles from '../styles.module.css'
import { Link } from 'gatsby'
import {
  webpackConfig,
  parcelConfig,
} from '../configurator/configurator-config'

import {
  createBabelConfig,
  getNpmDependencies,
  getDefaultProjectName,
} from '../configurator/configurator'

import FileBrowser from '../components/FileBrowser'

import Layout from '../components/layout'
import Features, {
  selectionRules as allSelectionRules,
} from '../components/configurator/Features'
import generateProject, {
  generateParcelProject,
} from '../configurator/project-generator'

const StepByStepArea = ({
  features,
  newNpmConfig,
  newBabelConfig,
  isReact,
  isWebpack,
}) => {
  const npmInstallCommand = _.isEmpty(newNpmConfig.dependencies)
    ? ''
    : '\nnpm install ' + newNpmConfig.dependencies.join(' ')
  const npmCommand =
    'mkdir myapp\ncd myapp\nnpm init -y\nnpm install --save-dev ' +
    newNpmConfig.devDependencies.join(' ') +
    npmInstallCommand
  const isTypescript = _.includes(features, 'Typescript')

  let babelStep = null
  if (newBabelConfig) {
    babelStep = (
      <div>
        <li>
          Create <i>.babelrc</i> in the root and copy the contents of the
          generated file
        </li>
      </div>
    )
  } else if (isTypescript) {
    //currently, you cannt use both typescript and babel.
    // if typescript is selected you must have a tsconf
    babelStep = (
      <div>
        <li>
          Create <i>tsconfig.json</i> in the root and copy the contents of the
          generated file
        </li>
      </div>
    )
  }
  let webpackStep = null
  if (isWebpack) {
    webpackStep = (
      <li>
        Create <i>webpack.config.js</i> in the root and copy the contents of the
        generated file
      </li>
    )
  }

  let srcFoldersStep = (
    <li>Create folders src and dist and create source code files</li>
  )

  return (
    <div className={styles.rightSection}>
      <h3>How to create your project yourself</h3>
      <ol>
        <li>Create an NPM project and install dependencies</li>
        <textarea readOnly={true} rows="6" cols="50" value={npmCommand} />
        {webpackStep}

        {babelStep}
        {srcFoldersStep}
      </ol>
      <Link to="/webpack-course">Need more detailed instructions?</Link>
    </div>
  )
}

function Tabs({ selected, setSelected }) {
  return (
    <div className={styles.tabsContainer}>
      <nav className={styles.tabs}>
        <button
          onClick={() => setSelected('webpack')}
          className={[
            selected === 'webpack' ? styles.selectedTab : null,
            styles.webpackTab,
          ].join(' ')}
        >
          <img
            src={require(`../../images/webpack-logo${
              selected === 'webpack' ? '-color' : ''
            }.png`)}
          />
          <div>Webpack</div>
        </button>
        <button
          onClick={() => setSelected('parcel')}
          className={[
            selected === 'parcel' ? styles.selectedTab : null,
            styles.parcelTab,
          ].join(' ')}
        >
          <img
            src={require(`../../images/parcel-logo${
              selected === 'parcel' ? '-color' : ''
            }.png`)}
          />
          <div>Parcel</div>
        </button>
      </nav>
    </div>
  )
}

const Button = ({ url }) => (
  <a href={url} className={styles.btn}>
    <img
      alt="zip-file"
      className={styles.icon}
      src={require('../../images/zip.svg')}
    />
    <span>Download</span>
  </a>
)

const selectionRules = {
  stopSelectFunctions: [
    allSelectionRules.stopSelectFunctions.stopIfNotBabelOrTypescriptForReact,
  ],
  additionalSelectFunctions: [
    allSelectionRules.additionalSelectFunctions.enforceEitherReactOrVue,
    allSelectionRules.additionalSelectFunctions.addBabelIfReact,
    allSelectionRules.additionalSelectFunctions.addOrRemoveReactHotLoader,
  ],
}

const parcelSelectionRules = {
  stopSelectFunctions: [
    allSelectionRules.stopSelectFunctions.stopIfNotBabelOrTypescriptForReact,
  ],
  additionalSelectFunctions: [
    allSelectionRules.additionalSelectFunctions.enforceEitherReactOrVue,
    allSelectionRules.additionalSelectFunctions.addBabelIfReact,
  ],
}

const buildConfigConfig = {
  webpack: {
    featureConfig: webpackConfig,
    projectGeneratorFunction: generateProject,
    defaultFile: 'webpack.config.js',
    selectionRules,
    downloadUrlBase:
      'https://s3-eu-west-1.amazonaws.com/jakoblind/zips-webpack/',
    extraElements: [
      <br key={1} />,
      <Link key={2} to="/webpack-course">
        Free webpack course
      </Link>,
      <br key={3} />,
    ],
  },
  parcel: {
    featureConfig: parcelConfig,
    projectGeneratorFunction: generateParcelProject,
    defaultFile: 'package.json',
    selectionRules: parcelSelectionRules,
    downloadUrlBase:
      'https://s3-eu-west-1.amazonaws.com/jakoblind/zips-parcel/',
  },
}

const initialState = (selectedTab = 'webpack') => ({
  selectedTab,
  selectedFeatures: {},
})

function reducer(state, action) {
  switch (action.type) {
    case 'setSelectedTab':
      const newAllPossibleFeatures = _.keys(
        buildConfigConfig[action.selectedTab].featureConfig.features
      )
      const selectedFeatures = _.chain(state.selectedFeatures)
        .map((selected, feature) => (selected ? feature : null))
        .reject(_.isNull)
        .value()

      const filteredFeatures = _.mapValues(
        state.selectedFeatures,
        (selected, feature) =>
          _.includes(newAllPossibleFeatures, feature) && selected
      )

      return {
        ...state,
        selectedTab: action.selectedTab,
        selectedFeatures: filteredFeatures,
      }
    case 'setSelectedFeatures':
      const setToSelected = !state.selectedFeatures[action.feature]
      //logFeatureClickToGa(feature, setToSelected)

      const selectedFature = Object.assign({}, state.selectedFeatures, {
        [action.feature]: setToSelected,
      })

      if (
        _.some(
          _.map(
            buildConfigConfig[state.selectedTab].selectionRules
              .stopSelectFunctions,
            fn => fn(selectedFature, action.feature, setToSelected)
          )
        )
      ) {
        return state
      }

      const newSelected = _.reduce(
        buildConfigConfig[state.selectedTab].selectionRules
          .additionalSelectFunctions,
        (currentSelectionMap, fn) =>
          fn(currentSelectionMap, action.feature, setToSelected),
        selectedFature
      )
      return { ...state, selectedFeatures: newSelected }

    default:
      throw new Error()
  }
}

function Configurator(props) {
  const [state, dispatch] = useReducer(reducer, initialState(props.selectedTab))
  const [hoverFeature, setHoverFeature] = useState({})

  function onMouseEnterFeature(feature) {
    setHoverFeature(feature)
  }
  function onMouseLeaveFeature() {
    setHoverFeature(null)
  }

  const selectedArray = _.chain(state.selectedFeatures)
    .map((v, k) => (v ? k : null))
    .reject(_.isNull)
    .value()

  const newBabelConfig = createBabelConfig(selectedArray)
  const newNpmConfig = getNpmDependencies(webpackConfig, selectedArray)

  const isReact = _.includes(selectedArray, 'React')
  const isTypescript = _.includes(selectedArray, 'Typescript')

  const projectname = getDefaultProjectName('empty-project', selectedArray)

  const {
    featureConfig,
    projectGeneratorFunction,
    defaultFile,
  } = buildConfigConfig[state.selectedTab]
  const showFeatures = _.clone(featureConfig.features)

  if (!isReact) {
    delete showFeatures['React hot loader']
  }
  if (isReact && isTypescript) {
    delete showFeatures['React hot loader']
  }

  return (
    <div>
      <Tabs
        selected={state.selectedTab}
        setSelected={selectedTab => {
          window.history.replaceState(null, null, `/${selectedTab}`)
          dispatch({ type: 'setSelectedTab', selectedTab })
        }}
      />

      <div className={styles.topContainer}>
        <div className={styles.marginsContainer}>
          <div className={styles.featuresContainer}>
            <Features
              features={showFeatures}
              selected={state.selectedFeatures}
              setSelected={feature =>
                dispatch({ type: 'setSelectedFeatures', feature })
              }
              onMouseEnter={onMouseEnterFeature}
              onMouseLeave={onMouseLeaveFeature}
            />
            <div className={styles.desktopOnly}>
              <Button
                url={`${
                  buildConfigConfig[state.selectedTab].downloadUrlBase
                }${projectname}.zip`}
              />
            </div>
            {buildConfigConfig[state.selectedTab].extraElements}
            <br />
            <a
              href="https://twitter.com/share?ref_src=twsrc%5Etfw"
              className="twitter-share-button"
              data-text="webpack config tool: create a webpack config in your browser"
              data-url="https://webpack.jakoblind.no/"
              data-via="karljakoblind"
              data-lang="en"
              data-show-count="false"
            >
              Tweet
            </a>
          </div>
          <div className={styles.codeContainer}>
            <FileBrowser
              projectGeneratorFunction={projectGeneratorFunction}
              featureConfig={featureConfig}
              features={selectedArray}
              highlightFeature={hoverFeature}
              defaultFile={defaultFile}
            />
            <br />
            <div className={styles.smallScreensOnly}>
              <Button
                url={`${
                  buildConfigConfig[state.selectedTab].downloadUrlBase
                }${projectname}.zip`}
              />
            </div>
          </div>
        </div>
        <div className={styles.container}>
          <div className={styles.container} />
          <StepByStepArea
            features={selectedArray}
            newNpmConfig={newNpmConfig}
            newBabelConfig={newBabelConfig}
            isReact={isReact}
            isWebpack={state.selectedTab === 'webpack'}
          />
        </div>
      </div>
    </div>
  )
}

function App(props) {
  const {
    pageContext: { selectedTab },
  } = props
  return (
    <Layout>
      <Configurator selectedTab={selectedTab} />
    </Layout>
  )
}

export default App
