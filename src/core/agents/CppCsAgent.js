export class CppCsAgent {
  constructor(agentRegistry) {
    this.registry = agentRegistry;
    this.id = 'agent_cpp_cs';
    this.name = 'Native Code Generator (C++ / C#)';
    if (this.registry && typeof this.registry.register === 'function') {
      this.registry.register(this);
    }
  }

  generateNativeNode(spec) {
    const {
 name, language, inputs = [], outputs = [], logic = '' } = spec;

    if (language === 'cpp') {
      return this.buildCppModule(name, inputs, outputs, logic);
    } else if (language === 'csharp' || language === 'cs') {
      return this.buildCSharpModule(name, inputs, outputs, logic);
    }
    throw new Error(`[CppCsAgent] Langage non pris en charge : ${language}`);
  }

  buildCppModule(name, inputs, outputs, logic) {
    return `#include <iostream>
#include <vector>
#include <memory>

class ${name}Node {
public:
    ${name}Node() = default;
    ~${name}Node() = default;

    void process() {
        ${logic || '// Traitement DSP'}
    }
};

extern "C" __attribute__((visibility("default"))) ${name}Node* create_${name}() {
    return new ${name}Node();
}

extern "C" __attribute__((visibility("default")))  void destroy_${name}(${name}Node* ptr) {
    delete ptr;
}`;
  }

  buildCSharpModule(name, inputs, outputs, logic) {
    return `using System;
using System.Runtime.InteropServices;

namespace NoCode.Engine.Nodes
{
    public class ${name}Node
    {
        public void Process()
        {
            ${logic || '// Traitement C#'}
        }
    }
}`;
  }
}