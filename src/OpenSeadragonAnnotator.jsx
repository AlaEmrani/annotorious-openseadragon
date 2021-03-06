import React, { Component } from 'react';
import { Editor } from '@recogito/recogito-client-core';
import OSDAnnotationLayer from './OSDAnnotationLayer';

export default class OpenSeadragonAnnotator extends Component {

  state = {
    selectedAnnotation: null,
    selectedDOMElement: null,
    modifiedTarget: null
  }

  /** Shorthand **/
  clearState = () => this.setState({
    selectedAnnotation: null,
    selectedDOMElement: null,
    modifiedTarget: null
  });

  componentDidMount() {
    this.annotationLayer = new OSDAnnotationLayer(this.props);

    this.annotationLayer.on('createSelection', this.handleCreateSelection);

    this.annotationLayer.on('select', this.handleSelect);

    this.annotationLayer.on('updateTarget', this.handleUpdateTarget);

    this.annotationLayer.on('moveSelection', this.handleMoveSelection);

    this.annotationLayer.on('mouseEnterAnnotation', this.props.onMouseEnterAnnotation);
    this.annotationLayer.on('mouseLeaveAnnotation', this.props.onMouseLeaveAnnotation);
  }

  componentWillUnmount() {
    this.annotationLayer.destroy();
  }

  handleCreateSelection = selection =>
    this.props.onSelectionCreated(selection.clone());

  handleSelect = evt => {
    const { annotation, element, skipEvent } = evt;
    if (annotation) {
      this.setState({ 
        selectedAnnotation: annotation, 
        selectedDOMElement: element 
      });

      if (!annotation.isSelection && !skipEvent)
        this.props.onAnnotationSelected(annotation.clone());
    } else {
      this.clearState();
    }
  }

  handleUpdateTarget = (selectedDOMElement, modifiedTarget) => {
    this.setState({ selectedDOMElement, modifiedTarget });

    const clone = JSON.parse(JSON.stringify(modifiedTarget));
    this.props.onSelectionTargetChanged(clone);
  }

  handleMoveSelection = selectedDOMElement =>
    this.setState({ selectedDOMElement });

  /**
   * A convenience method that allows the external application to
   * override the autogenerated Id for an annotation.
   */
  overrideAnnotationId = originalAnnotation => forcedId => {
    const { id } = originalAnnotation;

    // Force the editor to close first, otherwise there's a risk of orphaned annotation
    if (this.state.selectedAnnotation) {
      this.setState({
        selectedAnnotation: null,
        selectedDOMElement: null,
        modifiedTarget: null
      }, () => {
        this.annotationLayer.overrideId(id, forcedId);
      });
    } else {
      this.annotationLayer.overrideId(id, forcedId);
    }
  }

  /**************************/  
  /* Annotation CRUD events */
  /**************************/  

  onCreateOrUpdateAnnotation = method => (annotation, previous) => {
    // Merge updated target if necessary
    const a = (this.state.modifiedTarget) ?
      annotation.clone({ target: this.state.modifiedTarget }) : annotation.clone();

    // Call CREATE or UPDATE handler
    if (previous)
      this.props[method](a, previous.clone());
    else
      this.props[method](a, this.overrideAnnotationId(annotation));

    this.clearState();    
    this.annotationLayer.deselect();
    this.annotationLayer.addOrUpdateAnnotation(a, previous);
  }

  onDeleteAnnotation = annotation => {
    this.clearState();
    this.annotationLayer.removeAnnotation(annotation);
    this.props.onAnnotationDeleted(annotation);
  }

  onCancelAnnotation = annotation => {
    this.clearState();
    this.annotationLayer.deselect();

    if (annotation.isSelection)
      this.props.onSelectionCanceled(annotation);
  }

  /****************/               
  /* External API */
  /****************/

  addAnnotation = annotation =>
    this.annotationLayer.addOrUpdateAnnotation(annotation.clone());
  
  cancelSelected = () => {
    const { selectedAnnotation } = this.state;
    if (selectedAnnotation)
      this.onCancelAnnotation(selectedAnnotation);
  }
  
  fitBounds = (annotationOrId, immediately) =>
    this.annotationLayer.fitBounds(annotationOrId, immediately);
  
  getAnnotations = () =>
    this.annotationLayer.getAnnotations().map(a => a.clone());

  getSelected = () => {
    const selected = this.annotationLayer.getSelected();
    return selected ? selected.annotation.clone() : null;
  }

  getSelectedImageSnippet = () =>
    this.annotationLayer.getSelectedImageSnippet();

  panTo = (annotationOrId, immediately) =>
    this.annotationLayer.panTo(annotationOrId, immediately);

  removeAnnotation = annotation =>
    this.annotationLayer.removeAnnotation(annotation.clone());

  saveSelected = () => {
    const a = this.state.selectedAnnotation;

    if (a) {
      if (a.isSelection) {
        this.onCreateOrUpdateAnnotation('onAnnotationCreated')(a.toAnnotation(), a);
      } else {
        const { beforeHeadlessModify } = this.state;
        if (beforeHeadlessModify) {
          this.onCreateOrUpdateAnnotation('onAnnotationUpdated')(a, beforeHeadlessModify);
        } else {
          console.log('No change - canceling');
          this.onCancelAnnotation();
        } 
      }
    }
  }

  selectAnnotation = arg => {
    const annotation = this.annotationLayer.selectAnnotation(arg);
    
    if (annotation) 
      return annotation.clone();
    else 
      this.clearState(); // Deselect
  }
  
  setAnnotations = annotations =>
    this.annotationLayer.init(annotations.map(a => a.clone()));

  setDrawingEnabled = enable =>
    this.annotationLayer.setDrawingEnabled(enable);
  
  setDrawingTool = shape =>
    this.annotationLayer.setDrawingTool(shape);

  updateSelected = annotation => {
    if (this.state.selectedAnnotation)
      this.setState({ selectedAnnotation: annotation });
    else
      console.warn('No selection - cannot update');
  }

  render() {
    return (
      this.state.selectedAnnotation && (
        <Editor
          wrapperEl={this.props.wrapperEl}
          annotation={this.state.selectedAnnotation}
          selectedElement={this.state.selectedDOMElement}
          readOnly={this.props.config.readOnly}
          config={this.props.config}
          env={this.props.env}
          onAnnotationCreated={this.onCreateOrUpdateAnnotation('onAnnotationCreated')}
          onAnnotationUpdated={this.onCreateOrUpdateAnnotation('onAnnotationUpdated')}
          onAnnotationDeleted={this.onDeleteAnnotation}
          onCancel={this.onCancelAnnotation} />
      )
    )
  }

}